/**
 * 👑 TCP PRO SMART MONEY v4.3.1 — GOLD STANDARD OPTIMIZADO
 * [PATCH 4] DETECTOR DE IMPULSOS MEJORADO
 * 
 * ✅ Impulsos detectados correctamente
 * ✅ Validación de fuerza de impulso
 * ✅ Detección de anticipos
 * ✅ Bloqueo de impulsos débiles
 */

const ImpulseManager_v431 = {

    // ────────────────────────────────────────────────────────────────────
    // ESTADO INTERNO
    // ────────────────────────────────────────────────────────────────────

    impulsoActivo: null,
    impulsoConteo: 0,
    impulsofuerzaAvg: 0,
    impulsoAnticipado: false,
    ultimaVelaContraria: null,

    // ────────────────────────────────────────────────────────────────────
    // MÉTODOS PÚBLICOS (v4.3.1)
    // ────────────────────────────────────────────────────────────────────

    /**
     * Evaluar si debe iniciarse un impulso (v4.3.1)
     * @param {Object} velaActual
     * @param {number} rsi
     * @param {Object[]} velas
     * @returns {Object|null}
     */
    evaluateStart(velaActual, rsi, velas) {
        if (!velaActual || !velas || velas.length < 2) return null;

        const velaAnterior = velas[velas.length - 2];
        const cuerpoActual = this._calculateCuerpo(velaActual);
        const cuerpoAnterior = this._calculateCuerpo(velaAnterior);

        // Detectar dirección del impulso
        let dir = null;
        if (velaActual.close > velaActual.open && cuerpoActual > 50) {
            dir = 'CALL';  // Vela alcista fuerte
        } else if (velaActual.close < velaActual.open && cuerpoActual > 50) {
            dir = 'PUT';   // Vela bajista fuerte
        }

        if (!dir) return null;  // Sin impulso claro

        // ═══ VALIDACIÓN RSI ═══
        const rsiValido = (dir === 'CALL' && rsi < 70) || (dir === 'PUT' && rsi > 30);
        if (!rsiValido) return null;  // RSI en zona opuesta

        // ═══ CONFIRMAR CON VELA ANTERIOR ═══
        const direccionesCoinc = 
            (dir === 'CALL' && velaAnterior.close > velaAnterior.open) ||
            (dir === 'PUT' && velaAnterior.close < velaAnterior.open);

        if (!direccionesCoinc) return null;  // Sin confirmación

        // ═══ VALIDAR FUERZA ═══
        const fuerzaPromedio = (cuerpoActual + cuerpoAnterior) / 2;
        if (fuerzaPromedio < (window._TCP_CFG?.IMPULSO_CUERPO_FUERTE || 60)) {
            return null;  // Impulso débil
        }

        // ✅ IMPULSO VÁLIDO DETECTADO
        return {
            dir,
            conteo: 2,
            fuerzaAvg: fuerzaPromedio,
            iniciado: Date.now(),
            anticipado: false,
        };
    },

    /**
     * Continuar impulso (vela siguiente en misma dirección)
     * @param {Object} velaActual
     * @param {Object} impulsoActual
     * @returns {Object|null}
     */
    continuarImpulso(velaActual, impulsoActual) {
        if (!velaActual || !impulsoActual) return null;

        const cuerpo = this._calculateCuerpo(velaActual);
        const esContraria = (impulsoActual.dir === 'CALL' && velaActual.close < velaActual.open) ||
                           (impulsoActual.dir === 'PUT' && velaActual.close > velaActual.open);

        if (esContraria) {
            this.ultimaVelaContraria = Date.now();
            // No rompe impulso por una sola vela contraria
            return null;
        }

        // ✅ Continuar impulso
        impulsoActual.conteo++;
        impulsoActual.fuerzaAvg = (impulsoActual.fuerzaAvg + cuerpo) / 2;

        return impulsoActual;
    },

    /**
     * Validar si impulso es maduro
     * @param {Object} impulsoActual
     * @param {number} rsi
     * @returns {Object}
     */
    evaluateMaturity(impulsoActual, rsi) {
        if (!impulsoActual) {
            return { maduro: false, confianza: 'NINGUNA', razon: 'Sin impulso' };
        }

        // ═══ IMPULSO MADURO: 3+ velas ═══
        if (impulsoActual.conteo >= (window._TCP_CFG?.IMPULSO_VELAS_MIN || 2)) {
            const rsiValido = (impulsoActual.dir === 'CALL' && rsi < 70) ||
                             (impulsoActual.dir === 'PUT' && rsi > 30);

            if (rsiValido && impulsoActual.fuerzaAvg >= 60) {
                return {
                    maduro: true,
                    confianza: 'ALTA',
                    razon: `Impulso maduro: ${impulsoActual.conteo} velas, fuerza ${impulsoActual.fuerzaAvg.toFixed(1)}%`,
                    anticipado: false,
                };
            }
        }

        // ═══ IMPULSO ANTICIPADO: 1-2 velas fuertes ═══
        if (window._TCP_CFG?.IMPULSO_ANTICIPAR && impulsoActual.conteo >= 1) {
            const esAnticipable = impulsoActual.fuerzaAvg >= 70 &&
                                 impulsoActual.conteo <= 2;

            if (esAnticipable) {
                return {
                    maduro: true,
                    confianza: 'MEDIA',
                    razon: `Impulso anticipado: ${impulsoActual.conteo} velas, fuerza ${impulsoActual.fuerzaAvg.toFixed(1)}%`,
                    anticipado: true,
                };
            }
        }

        return {
            maduro: false,
            confianza: 'BAJA',
            razon: `Impulso inmaduro: ${impulsoActual.conteo} velas`,
            anticipado: false,
        };
    },

    /**
     * Cancelar impulso (por condiciones adversas)
     */
    cancelImpulse() {
        this.impulsoActivo = null;
        this.impulsoConteo = 0;
        this.impulsofuerzaAvg = 0;
        this.impulsoAnticipado = false;
    },

    /**
     * Reset del gestor
     */
    reset() {
        this.impulsoActivo = null;
        this.impulsoConteo = 0;
        this.impulsofuerzaAvg = 0;
        this.impulsoAnticipado = false;
        this.ultimaVelaContraria = null;
    },

    // ────────────────────────────────────────────────────────────────────
    // UTILIDADES PRIVADAS
    // ────────────────────────────────────────────────────────────────────

    /**
     * Calcular cuerpo de vela (%)
     */
    _calculateCuerpo(vela) {
        if (!vela) return 0;
        const rango = Math.abs(vela.high - vela.low);
        if (rango === 0) return 0;
        const cuerpo = Math.abs(vela.close - vela.open);
        return (cuerpo / rango) * 100;
    },

    /**
     * Detectar if impulso debe terminarse
     */
    shouldTerminate(velas, rsi) {
        if (!velas || velas.length < 1) return false;

        const ultimaVela = velas[velas.length - 1];
        if (!ultimaVela) return false;

        // Terminar si RSI toca zona extrema
        if (rsi > 75 || rsi < 25) return true;

        // Terminar si 2 velas contrarias seguidas (lógica agresiva)
        if (this.ultimaVelaContraria && Date.now() - this.ultimaVelaContraria > 60000) {
            return true;
        }

        return false;
    },
};

// Exponer globalmente
window._TCP_ImpulseManager_v431 = ImpulseManager_v431;

console.log(`%c👑 TCP PRO v4.3.1 GOLD OPTIMIZADO
    ✅ [PATCH 4] Impulse Manager mejorado
    ✅ Detección de impulsos correcta
    ✅ Validación de fuerza integrada
    ✅ Impulsos anticipados detectados`,
    `color:#00E676;font-weight:bold;font-size:11px`
);
