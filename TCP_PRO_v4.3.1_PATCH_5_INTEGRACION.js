/**
 * 👑 TCP PRO SMART MONEY v4.3.1 — PATCH 5
 * INTEGRACIÓN COMPLETA + LOGS LIMPIOS
 */

const SignalDispatcher_v431 = {
    createSignal(state, indicators, patterns) {
        if (!state || !indicators || !patterns || !patterns.length) return null;

        const rsi = indicators.rsi;
        const ema8 = indicators.ema8;
        const ema21 = indicators.ema21;
        const ema34 = indicators.ema34;

        if (rsi === null || ema8 === null || ema21 === null || ema34 === null) return null;

        const ScoringModule = window._TCP_ScoringSystem_v431 || {};
        const score = ScoringModule.calculateScore?.(state.velas, indicators, patterns) || 0;

        if (score < (window._TCP_CFG?.SCORE_MIN || 8)) return null;

        const FilterModule = window._TCP_FilterEngine_v431 || {};
        const signalTemp = { score, direccion: this._detectDirection(patterns, rsi) };
        const filtroResult = FilterModule.evaluateBlock?.(signalTemp, state) || {};

        if (filtroResult.bloqueada) return null;

        const ImpulseModule = window._TCP_ImpulseManager_v431 || {};
        const impulsoMaturity = ImpulseModule.evaluateMaturity?.(state.impulsoActual, rsi) || { maduro: false };

        const bonusImpulso = impulsoMaturity.maduro ? 1.1 : 1.0;

        const signal = {
            id: `SIG_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            simbolo: state.simbolo,
            direccion: this._detectDirection(patterns, rsi),
            score: Math.round(score * bonusImpulso),
            scoreAdaptivo: ScoringModule.calculateAdaptiveScore?.(score, rsi, patterns.length) || score,
            rsi: Math.round(rsi * 100) / 100,
            ema8: ema8,
            ema21: ema21,
            ema34: ema34,
            tendencia: indicators.tendencia || 'LATERAL',
            patrones: patterns.map(p => p.label || p.type).join('|'),
            resultado: 'PENDIENTE',
            ts: Date.now(),
        };

        FilterModule.registerSignal?.(signal);
        return signal;
    },

    _detectDirection(patterns, rsi) {
        if (!patterns || !patterns.length) return 'NEUTRAL';
        const callPatterns = patterns.filter(p => p.direction === 'CALL' || p.type?.includes('BULL')).length;
        const putPatterns = patterns.filter(p => p.direction === 'PUT' || p.type?.includes('BEAR')).length;
        if (callPatterns > putPatterns) return 'CALL';
        if (putPatterns > callPatterns) return 'PUT';
        return rsi > 50 ? 'CALL' : 'PUT';
    },

    dispatch(signal) {
        if (!signal) return null;
        const color = signal.direccion === 'CALL' ? '#00E676' : '#FF1744';
        console.log(`%c🎯 SEÑAL DISPARADA v4.3.1 | Dir: ${signal.direccion} | Score: ${signal.score}/20 | RSI: ${signal.rsi}`,
            `color:${color};font-weight:bold`);
        return signal;
    },
};

const LogSystem_v431 = {
    log(level, module, message, data) {
        const cfg = window._TCP_CFG || {};
        const levels = { 'ERROR': 0, 'WARN': 1, 'INFO': 2, 'DEBUG': 3 };
        const currentLevel = levels[cfg.LOG_LEVEL || 'INFO'] || 2;
        if (levels[level] > currentLevel) return;

        const timestamp = new Date().toLocaleTimeString('es-VE');
        const colors = { 'ERROR': '#FF1744', 'WARN': '#FFC107', 'INFO': '#00E676', 'DEBUG': '#90CAF9' };

        console.log(`%c[${timestamp}] [${module}] ${message}`,
            `color:${colors[level] || '#FFF'};font-weight:bold;font-size:11px`, data || '');
    },

    error(module, msg, data) { this.log('ERROR', module, msg, data); },
    warn(module, msg, data) { this.log('WARN', module, msg, data); },
    info(module, msg, data) { this.log('INFO', module, msg, data); },
    debug(module, msg, data) { this.log('DEBUG', module, msg, data); },
};

window._TCP_SignalDispatcher_v431 = SignalDispatcher_v431;
window._TCP_LogSystem_v431 = LogSystem_v431;

console.log(`%c👑 TCP PRO SMART MONEY v4.3.1 GOLD STANDARD OPTIMIZADO
═══════════════════════════════════════════════════════════════
✅ [PATCH 1] Módulos base expuestos
✅ [PATCH 2] Scoring System corregido
✅ [PATCH 3] Filtros mejorados
✅ [PATCH 4] Impulse Manager mejorado
✅ [PATCH 5] Integración completa + Logs limpios
SISTEMA LISTO PARA PRODUCCIÓN ✅`,
    `color:#FFD700;background:#0B0C10;font-weight:bold;font-size:12px;padding:10px`);
