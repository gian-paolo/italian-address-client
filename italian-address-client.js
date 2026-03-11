(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ItalianAddressClient = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    /**
     * @pallari/italian-address-client
     * Professional isomorphic library for certified Italian address lookup via 
     * the independent DataWS API (based on official ANNCSU data).
     */
    class ItalianAddressClient {
        constructor(options = {}) {
            this.baseUrl = options.baseUrl || 'https://anncsu-api.dataws.it/v1';
            this.debounceMs = options.debounceMs || 300;
            this.state = { region: null, province: null, municipality: null, street: null, dug_id: null };
            this._callbacks = {};
        }

        /**
         * Update internal state and trigger callbacks
         */
        _setState(key, value) {
            this.state[key] = value;
            const callbackKey = 'on' + key.charAt(0).toUpperCase() + key.slice(1) + 'Change';
            if (this._callbacks[callbackKey]) this._callbacks[callbackKey](value);
            if (this._callbacks.onStateChange) this._callbacks.onStateChange(this.state);
        }

        /**
         * Generic debounce helper - works in Browser and Node.js
         */
        debounce(func, wait = this.debounceMs) {
            let timeout;
            return (...args) => {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        /**
         * Generic API fetch helper - Compatible with Browser fetch and Node.js 18+
         */
        async _fetch(endpoint, params = {}) {
            const url = new URL(`${this.baseUrl}/${endpoint}`);
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) url.searchParams.append(k, v);
            });
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                return await res.json();
            } catch (e) {
                console.error(`ItalianAddressClient Error (${endpoint}):`, e);
                return [];
            }
        }

        /**
         * Generic RPC helper for PostgREST function calls
         */
        async _rpc(functionName, params = {}) {
            try {
                const res = await fetch(`${this.baseUrl}/rpc/${functionName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (!res.ok) throw new Error(`RPC Error: ${res.status}`);
                return await res.json();
            } catch (e) {
                console.error(`ItalianAddressClient RPC Error (${functionName}):`, e);
                return [];
            }
        }

        // --- Data Methods (Server & Browser) ---

        async getRegions() { return this._fetch('regions', { order: 'name.asc' }); }
        
        async getProvinces(regionCode = null) {
            const params = { order: 'name.asc' };
            if (regionCode) params.region_code = `eq.${regionCode}`;
            return this._fetch('provinces', params);
        }

        async getDugs() { return this._fetch('dugs', { order: 'nome.asc' }); }

        async searchMunicipalities(query, options = {}) {
            const params = { name: `ilike.*${query}*`, limit: options.limit || 50, order: 'name.asc' };
            if (options.province_code) params.province_code = `eq.${options.province_code}`;
            return this._fetch('municipalities', params);
        }

        async searchStreets(query, options = {}) {
            // Use Smart Search if requested (default) or if a DUG filter is present
            if (options.smart !== false || options.dug_id || options.strict) {
                const rpcParams = { search_text: query };
                if (options.istat_code) rpcParams.istat_filter = options.istat_code;
                if (options.dug_id) rpcParams.dug_id_filter = options.dug_id;
                if (options.strict) rpcParams.strict_mode = true;

                return this._rpc('search_streets_smart', rpcParams);
            }

            // Legacy/Standard search
            const params = { name: `ilike.*${query}*`, limit: options.limit || 100 };
            let endpoint = options.istat_code ? 'streets' : 'streets_full';
            if (options.istat_code) {
                params.istat_code = `eq.${options.istat_code}`;
                params.order = 'name.asc';
            } else {
                params.order = 'municipality.asc,name.asc';
            }
            return this._fetch(endpoint, params);
        }

        async getAddressDetails(id) {
            const data = await this._fetch('address_details', { id: `eq.${id}` });
            return data.length > 0 ? data[0] : null;
        }

        // --- UI Methods (Browser Only) ---

        attachAutocomplete(config) {
            if (typeof window === 'undefined') {
                throw new Error('attachAutocomplete() requires a browser environment with DOM access.');
            }
            const { fields, outputs, options = {} } = config;
            
            // Register callbacks
            this._callbacks = {
                onRegionChange: config.onRegionChange,
                onProvinceChange: config.onProvinceChange,
                onMunicipalityChange: config.onMunicipalityChange,
                onStreetChange: config.onStreetChange,
                onDug_idChange: config.onDugChange, // Alias dug_id to Dug for consistency
                onStateChange: config.onStateChange
            };
            
            if (fields.region) this._bindElement(fields.region, () => this.getRegions(), (item) => {
                this._setState('region', item);
                if (outputs?.region_code) outputs.region_code.value = item.code;
                this._resetDownstream('region', config);
            });

            if (fields.province) this._bindElement(fields.province, () => this.getProvinces(this.state.region?.code), (item) => {
                this._setState('province', item);
                if (outputs?.province_code) outputs.province_code.value = item.code;
                this._resetDownstream('province', config);
            });

            if (fields.street_type && fields.street_type.tagName === 'SELECT') {
                this._refreshSelect(fields.street_type, () => this.getDugs());
                fields.street_type.addEventListener('change', (e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    this._setState('dug_id', val);
                });
            }

            if (fields.municipality) this._bindElement(fields.municipality, (v) => this.searchMunicipalities(v, { province_code: this.state.province?.code }), (item) => {
                this._setState('municipality', item);
                if (outputs?.istat_code) outputs.istat_code.value = item.istat_code;
                this._resetDownstream('municipality', config);
            });

            if (fields.street) this._bindElement(fields.street, (v) => this.searchStreets(v, { 
                istat_code: this.state.municipality?.istat_code,
                dug_id: this.state.dug_id,
                smart: options.smart !== false, // Smart by default in autocomplete
                strict: options.strict || false
            }), (item) => {
                this._setState('street', item);
                if (outputs?.street_id) outputs.street_id.value = item.id;
                
                // If we didn't have a municipality, fill it from the street result
                if (!this.state.municipality && fields.municipality) {
                    this._setState('municipality', { istat_code: item.istat_code, name: item.display_municipality });
                    this._setElementValue(fields.municipality, item.display_municipality);
                }
                // If we didn't have a DUG selected, try to sync the select if present
                if (!this.state.dug_id && fields.street_type && fields.street_type.tagName === 'SELECT') {
                    this._setElementValue(fields.street_type, item.street_type);
                    // No need to call _setState('dug_id') here as the change event on select won't fire
                    // but the internal state will be partially out of sync with UI until next select change.
                    // Let's force it:
                    const selectedDug = Array.from(fields.street_type.options).find(o => o.textContent === item.street_type);
                    if (selectedDug) this._setState('dug_id', parseInt(selectedDug.value));
                }
            });
        }

        _bindElement(el, sourceFn, onSelect) {
            if (el.tagName === 'SELECT') {
                this._refreshSelect(el, sourceFn);
                el.addEventListener('change', (e) => {
                    const selected = e.target.selectedOptions[0];
                    if (!selected || !selected.dataset.raw) return;
                    onSelect(JSON.parse(selected.dataset.raw));
                });
            } else {
                this._setupAutocomplete(el, sourceFn, onSelect);
            }
        }

        async _refreshSelect(el, sourceFn) {
            el.innerHTML = '<option value="">...</option>';
            const data = await sourceFn('');
            el.innerHTML = '<option value="">-- Seleziona --</option>';
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id || item.code || item.istat_code;
                opt.textContent = item.nome || item.name || item.display_name;
                opt.dataset.raw = JSON.stringify(item);
                el.appendChild(opt);
            });
        }

        _setupAutocomplete(el, sourceFn, onSelect) {
            let suggEl = document.createElement('div');
            suggEl.className = 'anncsu-suggestions-list';
            document.body.appendChild(suggEl);

            const position = () => {
                const r = el.getBoundingClientRect();
                suggEl.style.cssText = `display:none; position:absolute; z-index:9999; background:white; border:1px solid #ccc; width:${r.width}px; left:${r.left + window.scrollX}px; top:${r.bottom + window.scrollY}px; max-height:200px; overflow-y:auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);`;
            };

            el.addEventListener('input', this.debounce(async (e) => {
                const val = e.target.value;
                if (val.length < 2) { suggEl.style.display = 'none'; return; }
                const data = await sourceFn(val);
                suggEl.innerHTML = '';
                if (data.length > 0) {
                    position();
                    suggEl.style.display = 'block';
                    data.forEach(item => {
                        const div = document.createElement('div');
                        div.style.padding = '8px'; div.style.cursor = 'pointer'; div.style.borderBottom = '1px solid #eee';
                        const label = item.name || item.display_name;
                        div.innerHTML = `<div>${item.display_street_type || ''} <strong>${label}</strong></div><small style="color:#666">${item.province || item.display_municipality || ''}</small>`;
                        div.onclick = () => {
                            el.value = label; // Only the propre name, not the DUG if we are in smart/split mode
                            suggEl.style.display = 'none';
                            onSelect(item);
                        };
                        suggEl.appendChild(div);
                    });
                }
            }));
            document.addEventListener('click', (e) => { if (e.target !== el) suggEl.style.display = 'none'; });
        }

        _resetDownstream(level, config) {
            const levels = ['region', 'province', 'municipality', 'street'];
            const idx = levels.indexOf(level);
            for (let i = idx + 1; i < levels.length; i++) {
                const l = levels[i];
                this._setState(l, null);
                if (config.fields[l]) {
                    if (config.fields[l].tagName === 'SELECT') this._refreshSelect(config.fields[l], () => this._getDownstreamSource(l));
                    else config.fields[l].value = '';
                }
                if (config.outputs && config.outputs[l + (l === 'street' ? '_id' : '_code')]) config.outputs[l + (l === 'street' ? '_id' : '_code')].value = '';
            }
        }

        _getDownstreamSource(level) {
            if (level === 'province') return this.getProvinces(this.state.region?.code);
            if (level === 'municipality') return this.searchMunicipalities('', { province_code: this.state.province?.code });
            return [];
        }

        _setElementValue(el, val) {
            if (el.tagName === 'SELECT') {
                for (let opt of el.options) if (opt.textContent === val || opt.value == val) { el.value = opt.value; break; }
            } else el.value = val;
        }
    }

    return ItalianAddressClient;
}));
