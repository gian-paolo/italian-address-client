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
     * Professional isomorphic library for certified Italian address lookup (ANNCSU/DataWS)
     */
    class ItalianAddressClient {
        constructor(options = {}) {
            this.baseUrl = options.baseUrl || 'https://anncsu-api.dataws.it/v1';
            this.state = { region: null, province: null, municipality: null, street: null };
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

        // --- Data Methods (Server & Browser) ---

        async getRegions() { return this._fetch('regions', { order: 'name.asc' }); }
        async getProvinces(regionCode = null) {
            const params = { order: 'name.asc' };
            if (regionCode) params.region_code = `eq.${regionCode}`;
            return this._fetch('provinces', params);
        }
        async searchMunicipalities(query, options = {}) {
            const params = { name: `ilike.*${query}*`, limit: options.limit || 50, order: 'name.asc' };
            if (options.province_code) params.province_code = `eq.${options.province_code}`;
            return this._fetch('municipalities', params);
        }
        async searchStreets(query, options = {}) {
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
            const { fields, outputs } = config;
            
            if (fields.region) this._bindElement(fields.region, () => this.getRegions(), (item) => {
                this.state.region = item;
                if (outputs?.region_code) outputs.region_code.value = item.code;
                this._resetDownstream('region', config);
            });

            if (fields.province) this._bindElement(fields.province, () => this.getProvinces(this.state.region?.code), (item) => {
                this.state.province = item;
                if (outputs?.province_code) outputs.province_code.value = item.code;
                this._resetDownstream('province', config);
            });

            if (fields.municipality) this._bindElement(fields.municipality, (v) => this.searchMunicipalities(v, { province_code: this.state.province?.code }), (item) => {
                this.state.municipality = item;
                if (outputs?.istat_code) outputs.istat_code.value = item.istat_code;
                this._resetDownstream('municipality', config);
            });

            if (fields.street) this._bindElement(fields.street, (v) => this.searchStreets(v, { istat_code: this.state.municipality?.istat_code }), (item) => {
                this.state.street = item;
                if (outputs?.street_id) outputs.street_id.value = item.id;
                if (!this.state.municipality && fields.municipality) this._setElementValue(fields.municipality, item.display_municipality);
            });
        }

        _bindElement(el, sourceFn, onSelect) {
            if (el.tagName === 'SELECT') {
                this._refreshSelect(el, sourceFn);
                el.addEventListener('change', (e) => {
                    if (!e.target.selectedOptions[0].dataset.raw) return;
                    onSelect(JSON.parse(e.target.selectedOptions[0].dataset.raw));
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
                opt.value = item.code || item.istat_code || item.id;
                opt.textContent = item.name || item.display_name;
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

            el.addEventListener('input', this._debounce(async (e) => {
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
                            el.value = (item.display_street_type ? item.display_street_type + ' ' : '') + label;
                            suggEl.style.display = 'none';
                            onSelect(item);
                        };
                        suggEl.appendChild(div);
                    });
                }
            }, 300));
            document.addEventListener('click', (e) => { if (e.target !== el) suggEl.style.display = 'none'; });
        }

        _resetDownstream(level, config) {
            const levels = ['region', 'province', 'municipality', 'street'];
            const idx = levels.indexOf(level);
            for (let i = idx + 1; i < levels.length; i++) {
                const l = levels[i];
                this.state[l] = null;
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
                for (let opt of el.options) if (opt.textContent === val) { el.value = opt.value; break; }
            } else el.value = val;
        }

        _debounce(func, timeout) {
            let timer;
            return (...args) => { clearTimeout(timer); timer = setTimeout(() => { func.apply(this, args); }, timeout); };
        }
    }

    return ItalianAddressClient;
}));
