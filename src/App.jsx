import React, { useState, useMemo } from 'react';
import {
    Upload,
    FileText,
    DollarSign,
    Wrench,
    TrendingUp,
    Users,
    Calendar,
    PieChart,
    Smartphone,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Info,
    Filter,
    XCircle,
    BarChart2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart as RePieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    ComposedChart
} from 'recharts';

// --- CORES ---
const COLORS = {
    primary: '#3b82f6', // blue
    success: '#10b981', // green
    warning: '#f59e0b', // amber
    danger: '#ef4444', // red
    purple: '#8b5cf6',
    gray: '#6b7280'
};

const PIE_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8b5cf6'
];

// --- FUNÇÕES UTILITÁRIAS ---

const parseCurrency = (valueStr) => {
    if (!valueStr) return 0;
    let cleanStr = valueStr.toString().trim();
    cleanStr = cleanStr.replace(/["']/g, ''); // Remove aspas

    if (!cleanStr || cleanStr === '-' || cleanStr === '-----') return 0;

    // Formato brasileiro: 1.000,00
    if (cleanStr.includes(',') && !cleanStr.includes('.')) {
        cleanStr = cleanStr.replace(',', '.');
    } else if (cleanStr.includes(',') && cleanStr.includes('.')) {
        if (cleanStr.lastIndexOf(',') > cleanStr.lastIndexOf('.')) {
            cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
        } else {
            cleanStr = cleanStr.replace(/,/g, '');
        }
    }

    const val = parseFloat(cleanStr);
    return isNaN(val) ? 0 : val;
};

const extractBrand = (equipString) => {
    if (!equipString) return 'Outros';
    const str = equipString.toUpperCase();

    // Prioridade 1: Palavras Chave Comuns
    const brands = [
        'SAMSUNG', 'APPLE', 'IPHONE', 'IPAD', 'WATCH', 'XIAOMI', 'REDMI', 'POCO',
        'MOTOROLA', 'MOTO', 'LG', 'ASUS', 'DELL', 'HP', 'LENOVO', 'ACER', 'SONY', 'POSITIVO'
    ];

    for (let brand of brands) {
        if (str.includes(brand)) {
            if (brand === 'IPHONE' || brand === 'IPAD' || brand === 'WATCH') return 'Apple';
            if (brand === 'REDMI' || brand === 'POCO') return 'Xiaomi';
            if (brand === 'MOTO') return 'Motorola';
            return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
        }
    }

    // Prioridade 2: Tentar pegar pelo padrão "MODELO - MARCA - MODELO"
    const parts = equipString.split('-');
    if (parts.length >= 2) {
        const potentialBrand = parts[1].trim();
        if (potentialBrand.length > 2 && potentialBrand.length < 15) {
            return potentialBrand.charAt(0).toUpperCase() + potentialBrand.slice(1).toLowerCase();
        }
    }

    return 'Outros';
};

// Parser CSV Resiliente
const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n|\r/);
    const data = [];

    let headerIndex = -1;
    let headers = [];
    let delimiter = ',';

    // 1. Encontrar a linha de cabeçalho
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].toUpperCase();
        if (line.includes('CLIENTE') && (line.includes('VALOR') || line.includes('TOTAL') || line.includes('SITU'))) {
            headerIndex = i;
            const commaCount = (lines[i].match(/,/g) || []).length;
            const semiCount = (lines[i].match(/;/g) || []).length;
            delimiter = semiCount > commaCount ? ';' : ',';
            headers = lines[i].split(delimiter).map(h => h.replace(/["']/g, '').trim());
            break;
        }
    }

    if (headerIndex === -1) {
        return { data: [], error: "Cabeçalho não encontrado (procuramos por 'Cliente' e 'Valor')." };
    }

    // Mapeamento de Colunas
    const colMap = {
        cliente: -1, valorTotal: -1, valorCusto: -1, situacao: -1,
        data: -1, equipamento: -1, origem: -1
    };

    headers.forEach((h, idx) => {
        const header = h.toUpperCase();
        if (header.includes('CLIENTE')) colMap.cliente = idx;
        else if (header.includes('VALOR TOTAL')) colMap.valorTotal = idx;
        else if (header.includes('VALOR CUSTO')) colMap.valorCusto = idx;
        else if (header.includes('SITUA') || header.includes('STATUS')) colMap.situacao = idx;
        else if (header === 'DATA' || header.includes('DATA ABERTURA')) colMap.data = idx;
        else if (header.includes('EQUIPAMENTO') || header.includes('APARELHO')) colMap.equipamento = idx;
        else if (header.includes('COMO CONHECEU') || header.includes('ORIGEM')) colMap.origem = idx;
    });

    // 2. Processar Linhas de Dados
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        let values = [];
        if (delimiter === ',') values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        else values = line.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        values = values.map(val => val ? val.replace(/^"|"$/g, '').trim() : '');

        if (values.length > colMap.cliente) {
            const rawDate = colMap.data > -1 ? values[colMap.data] : '';
            let dateObj = null;
            let isoDate = '';

            // Parse Date for Filtering
            if (rawDate && rawDate.length >= 8) {
                const parts = rawDate.split('/');
                if (parts.length === 3) {
                    // assume DD/MM/YYYY
                    const d = parseInt(parts[0]);
                    const m = parseInt(parts[1]) - 1; // JS Month is 0-11
                    const y = parseInt(parts[2].substring(0, 4));
                    dateObj = new Date(y, m, d);
                    isoDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                }
            }

            data.push({
                id: i,
                cliente: colMap.cliente > -1 ? values[colMap.cliente] : 'Desconhecido',
                valorTotal: colMap.valorTotal > -1 ? parseCurrency(values[colMap.valorTotal]) : 0,
                valorCusto: colMap.valorCusto > -1 ? parseCurrency(values[colMap.valorCusto]) : 0,
                situacao: colMap.situacao > -1 ? values[colMap.situacao] : 'Indefinido',
                data: rawDate,
                dateObj: dateObj,
                isoDate: isoDate,
                equipamento: colMap.equipamento > -1 ? values[colMap.equipamento] : '',
                brand: extractBrand(colMap.equipamento > -1 ? values[colMap.equipamento] : ''),
                origem: colMap.origem > -1 ? values[colMap.origem] : 'Não Informado'
            });
        }
    }

    return { data, headersFound: headers, detectedDelimiter: delimiter };
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// --- COMPONENTES ---

const MetricCard = ({ title, value, subtext, icon: Icon, colorClass, trend }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
                <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
        </div>
        {subtext && (
            <div className="mt-4 flex items-center text-sm">
                <span className={`font-medium ${trend === 'up' ? 'text-green-600' : 'text-slate-600'}`}>
                    {subtext}
                </span>
            </div>
        )}
    </div>
);

export default function App() {
    const [rawData, setRawData] = useState([]);
    const [fileName, setFileName] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorDetails, setErrorDetails] = useState(null);
    const [showDebug, setShowDebug] = useState(false);

    // Filters State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        status: 'Todos',
        brand: 'Todas',
        origin: 'Todas'
    });

    // --- PROCESSAMENTO DO ARQUIVO ---
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsProcessing(true);
        setErrorDetails(null);
        setShowDebug(false);
        setRawData([]);

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const debugSnippet = text.substring(0, 1000);
                const result = parseCSV(text);

                if (result.error || result.data.length === 0) {
                    setErrorDetails({
                        msg: result.error || "Nenhum dado encontrado após o cabeçalho.",
                        snippet: debugSnippet
                    });
                    setIsProcessing(false);
                    return;
                }

                setRawData(result.data);
            } catch (error) {
                console.error("Erro fatal:", error);
                setErrorDetails({ msg: "Erro inesperado: " + error.message, snippet: "N/A" });
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    // --- LISTAS PARA OS FILTROS ---
    const filterOptions = useMemo(() => {
        if (!rawData.length) return { statuses: [], brands: [], origins: [] };

        const statuses = new Set(['Todos']);
        const brands = new Set(['Todas']);
        const origins = new Set(['Todas']);

        rawData.forEach(row => {
            if (row.situacao) statuses.add(row.situacao);
            if (row.brand) brands.add(row.brand);
            if (row.origem) origins.add(row.origem);
        });

        return {
            statuses: Array.from(statuses).sort(),
            brands: Array.from(brands).sort(),
            origins: Array.from(origins).sort()
        };
    }, [rawData]);

    // --- FILTRAGEM E CÁLCULOS ---
    const insights = useMemo(() => {
        if (rawData.length === 0) return null;

        // 1. Filtragem
        const filteredData = rawData.filter(row => {
            if (filters.startDate && row.isoDate < filters.startDate) return false;
            if (filters.endDate && row.isoDate > filters.endDate) return false;
            if (filters.status !== 'Todos' && row.situacao !== filters.status) return false;
            if (filters.brand !== 'Todas' && row.brand !== filters.brand) return false;
            if (filters.origin !== 'Todas' && row.origem !== filters.origin) return false;
            return true;
        });

        // 2. Agregação
        let totalRevenue = 0;
        let totalCost = 0;
        let count = 0;
        let completedCount = 0;

        const statusCount = {};
        const brandCount = {};
        const sourceCount = {};
        const dateGroups = {};
        const monthGroups = {};

        filteredData.forEach(row => {
            if (row.valorTotal === 0 && row.situacao === 'Indefinido' && !row.data) return;

            totalRevenue += row.valorTotal;
            totalCost += row.valorCusto;
            count++;

            const upperStatus = row.situacao.toUpperCase();
            if (upperStatus.includes('CONCRETIZADA') || upperStatus.includes('ENTREGUE') || upperStatus.includes('FINALIZADA')) {
                completedCount++;
            }

            statusCount[row.situacao] = (statusCount[row.situacao] || 0) + 1;
            sourceCount[row.origem] = (sourceCount[row.origem] || 0) + 1;
            brandCount[row.brand] = (brandCount[row.brand] || 0) + 1;

            // Agrupamento Diário e Mensal
            if (row.isoDate) {
                // Daily
                if (!dateGroups[row.isoDate]) {
                    dateGroups[row.isoDate] = { date: row.isoDate, displayDate: row.data, revenue: 0, count: 0 };
                }
                dateGroups[row.isoDate].revenue += row.valorTotal;
                dateGroups[row.isoDate].count += 1;

                // Monthly
                const monthKey = row.isoDate.substring(0, 7); // "YYYY-MM"
                if (!monthGroups[monthKey]) {
                    monthGroups[monthKey] = {
                        key: monthKey,
                        dateObj: row.dateObj,
                        revenue: 0,
                        count: 0
                    };
                }
                monthGroups[monthKey].revenue += row.valorTotal;
                monthGroups[monthKey].count += 1;
            }
        });

        const netProfit = totalRevenue - totalCost;
        const avgTicket = count > 0 ? totalRevenue / count : 0;
        const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        // Processar Arrays
        const timelineData = Object.values(dateGroups)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({
                ...d,
                avgTicket: d.count > 0 ? d.revenue / d.count : 0
            }));

        const monthlyData = Object.values(monthGroups)
            .sort((a, b) => a.key.localeCompare(b.key))
            .map(m => ({
                ...m,
                name: m.dateObj ? m.dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '') : m.key,
                avgTicket: m.count > 0 ? m.revenue / m.count : 0
            }));

        return {
            filteredData,
            totalRevenue,
            totalCost,
            netProfit,
            count,
            completedCount,
            avgTicket,
            margin,
            timelineData,
            monthlyData,
            statusChartData: Object.keys(statusCount).map(k => ({ name: k, value: statusCount[k] })).sort((a, b) => b.value - a.value),
            brandChartData: Object.keys(brandCount).map(k => ({ name: k, orders: brandCount[k] })).sort((a, b) => b.orders - a.orders).slice(0, 10),
            sourceChartData: Object.keys(sourceCount).map(k => ({ name: k, value: sourceCount[k] })).sort((a, b) => b.value - a.value),
        };

    }, [rawData, filters]);

    // Handler para inputs
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            status: 'Todos',
            brand: 'Todas',
            origin: 'Todas'
        });
    };

    // --- RENDERIZAÇÃO ---

    if (!rawData.length || !insights) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 overflow-auto">
                <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Upload className="w-10 h-10 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Dashboard de O.S.</h1>
                    <p className="text-slate-500 mb-8">
                        Faça upload do seu relatório em formato <strong>.CSV</strong>.
                    </p>

                    <label className="block w-full cursor-pointer group">
                        <input
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <div className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 group-hover:shadow-blue-300 flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5" />
                            {isProcessing ? 'Analisando...' : 'Selecionar Arquivo CSV'}
                        </div>
                    </label>

                    {errorDetails && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg text-left">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-red-800">Erro de Leitura</h4>
                                    <p className="text-sm text-red-700 mt-1">{errorDetails.msg}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex items-start gap-2 bg-blue-50 p-3 rounded-lg text-left text-xs text-blue-800">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        <p><strong>Dica:</strong> Salve seu Excel como "CSV (Separado por vírgulas)" antes de enviar.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            {/* HEADER */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Logo e Titulo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                                <Wrench className="text-white w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 leading-none">Painel de O.S.</h1>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    {insights.filteredData.length} registros filtrados
                                    <span className="text-slate-300">|</span>
                                    Total: {rawData.length}
                                </p>
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setRawData([]); setFileName(null); clearFilters(); }}
                                className="text-sm text-slate-600 hover:text-slate-800 font-medium hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Novo Arquivo
                            </button>
                        </div>
                    </div>

                    {/* BARRA DE FILTROS */}
                    <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">De:</label>
                            <input
                                type="date"
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Até:</label>
                            <input
                                type="date"
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Status
                            </label>
                            <select
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-white"
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                {filterOptions.statuses.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                                <Smartphone className="w-3 h-3" /> Marca
                            </label>
                            <select
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-white"
                                value={filters.brand}
                                onChange={(e) => handleFilterChange('brand', e.target.value)}
                            >
                                {filterOptions.brands.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="w-full h-[38px] flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* KPI GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Faturamento"
                        value={formatCurrency(insights.totalRevenue)}
                        subtext={`Lucro: ${formatCurrency(insights.netProfit)}`}
                        icon={DollarSign}
                        colorClass="bg-blue-500 text-blue-600"
                        trend="up"
                    />
                    <MetricCard
                        title="Total Ordens"
                        value={insights.count}
                        subtext={`${insights.count > 0 ? Math.round((insights.completedCount / insights.count) * 100) : 0}% Concretizadas`}
                        icon={FileText}
                        colorClass="bg-purple-500 text-purple-600"
                    />
                    <MetricCard
                        title="Ticket Médio"
                        value={formatCurrency(insights.avgTicket)}
                        subtext="Nesta seleção"
                        icon={TrendingUp}
                        colorClass="bg-emerald-500 text-emerald-600"
                        trend="up"
                    />
                    <MetricCard
                        title="Margem"
                        value={`${insights.margin.toFixed(1)}%`}
                        subtext={`Custo: ${formatCurrency(insights.totalCost)}`}
                        icon={PieChart}
                        colorClass="bg-amber-500 text-amber-600"
                    />
                </div>

                {/* MENSAL CHART */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-500" />
                            Performance Mensal
                        </h3>
                        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 mt-2 md:mt-0">
                            Barras: Quantidade | Linha: Faturamento
                        </div>
                    </div>
                    <div className="h-72 w-full">
                        {insights.monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={insights.monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        label={{ value: 'Qtd', angle: -90, position: 'insideLeft', fill: '#8b5cf6' }}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => `R$${val / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value, name) => [
                                            name === 'Faturamento' ? formatCurrency(value) : value,
                                            name
                                        ]}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="count" fill="#8b5cf6" name="Qtd. O.S." radius={[4, 4, 0, 0]} barSize={40} />
                                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Faturamento" dot={{ r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                Nenhum dado mensal disponível.
                            </div>
                        )}
                    </div>
                </div>

                {/* DIÁRIO CHARTS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Main Chart - Revenue Timeline */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-blue-500" />
                            Faturamento Diário
                        </h3>
                        <div className="h-64 w-full">
                            {insights.timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={insights.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="displayDate"
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke={COLORS.primary}
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                            name="Receita"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Sem dados.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NEW Chart - Quantity Daily */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-indigo-500" />
                            Volume de O.S. (Diário)
                        </h3>
                        <div className="h-64 w-full">
                            {insights.timelineData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={insights.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="displayDate"
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="count" fill="#6366f1" name="Quantidade" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Sem dados.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* TICKET MEDIO CHART */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Evolução do Ticket Médio
                    </h3>
                    <div className="h-56 w-full">
                        {insights.timelineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={insights.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="displayDate"
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `R$${val}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => formatCurrency(value)}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avgTicket"
                                        stroke={COLORS.success}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6 }}
                                        name="Ticket Médio"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                Sem dados.
                            </div>
                        )}
                    </div>
                </div>

                {/* PIE CHARTS + LISTAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pie Chart - Status */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Status
                        </h3>
                        <div className="flex-1 min-h-[300px]">
                            {insights.statusChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={insights.statusChartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {insights.statusChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, 'Qtd']} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </RePieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Sem dados.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bar Chart - Brands */}
                    <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm lg:col-span-2">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-purple-500" />
                            Top Marcas
                        </h3>
                        <div className="h-72 w-full">
                            {insights.brandChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={insights.brandChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                        <Bar dataKey="orders" fill={COLORS.purple} radius={[4, 4, 0, 0]} barSize={40} name="Quantidade" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Sem dados.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* LISTA RECENTE */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Registros (Visualização: {Math.min(10, insights.filteredData.length)})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Equipamento</th>
                                    <th className="px-6 py-3">Situação</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {insights.filteredData.slice(0, 10).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-3 text-slate-600">{row.data}</td>
                                        <td className="px-6 py-3 text-slate-600 font-medium truncate max-w-[150px]" title={row.cliente}>{row.cliente}</td>
                                        <td className="px-6 py-3 text-slate-600 truncate max-w-[200px]" title={row.equipamento}>{row.equipamento}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${(row.situacao || '').toUpperCase().includes('CONCRETIZADA') ? 'bg-green-100 text-green-800' :
                                                    (row.situacao || '').toUpperCase().includes('CANCELADA') ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                                {row.situacao}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-700">
                                            {formatCurrency(row.valorTotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
} 
