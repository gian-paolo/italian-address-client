# Italian Address Lookup & Normalization (JS Client)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![API Status](https://img.shields.io/badge/API-Live-brightgreen)](https://anncsu.dataws.it)

The most efficient way to integrate **certified Italian address lookup** into your web applications. This library provides a seamless interface for the **DataWS Italian Address API**, an independent gateway serving official national data from the [ANNCSU database](https://anncsu.dataws.it).

> **Important Disclosure:** This is an **independent third-party service** provided by DataWS. While the data is sourced from official Italian institutional archives (ISTAT & Revenue Agency), the API service and this client are not affiliated with, authorized by, or in any way connected to any government body.

## 🚀 Why use this?
Inaccurate address data costs money. Whether it's for e-commerce checkouts, shipping forms, or user registration, this client ensures your data is:
- **Verified:** Based on official data from **ISTAT** and **Italian Revenue Agency**.
- **Formatted:** Consistent Title Case formatting (e.g., *Via D'Azeglio* instead of *VIA D'AZEGLIO*).
- **Enriched:** Includes ISTAT codes, province initials, and region data.

## ✨ Key Features
- **Zero Dependencies:** Pure Vanilla JS (less than 10KB).
- **Geographic Cascading:** Automatic filtering from Region > Province > Municipality > Street.
- **Auto-Mapping:** Save technical IDs (ISTAT, Street ID) directly to your hidden fields.
- **National Search:** Users can type a street name, and the client will automatically identify the correct city.

---

## 📦 Installation

### Browser (CDN)
Simply include the library in your project via jsDelivr:
```html
<script src="https://cdn.jsdelivr.net/npm/@pallari/italian-address-client@1.0.0/italian-address-client.js"></script>
```

### Node.js (NPM)
```bash
npm install @pallari/italian-address-client
```

## 🛠 Usage

### Browser (Professional UI Integration)
The library includes a powerful `attachAutocomplete` method that handles the entire UI logic for you.

```javascript
const client = new ItalianAddressClient();
client.attachAutocomplete({
    fields: {
        municipality: document.getElementById('city-input'),
        street: document.getElementById('street-input')
    }
});
```

### Node.js (Server-side Validation/Normalization)
You can use the client to validate or normalize addresses in your backend.

```javascript
const ItalianAddressClient = require('@pallari/italian-address-client');
const client = new ItalianAddressClient();

async function validateAddress() {
    const streets = await client.searchStreets('Via Roma', { istat_code: '015146' });
    console.log(streets[0]); // Certified data from ANNCSU
}
```

### Advanced: Geographical Filters (Region & Province)
You can use standard `<select>` menus for higher-level filters. The client handles the cascading logic:

```javascript
client.attachAutocomplete({
    fields: {
        region: document.getElementById('region-select'), // <select>
        province: document.getElementById('province-select'), // <select>
        municipality: document.getElementById('city-input') // <input>
    }
});
```

---

## 🇮🇹 Supporto Italiano
Cerchi una soluzione per la **normalizzazione degli indirizzi** in Italia? Questo client ti permette di accedere al database ufficiale nazionale (ANNCSU) per garantire che ogni indirizzo inserito dai tuoi utenti sia certificato e geograficamente corretto.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Enterprise Support
Need a dedicated API key with higher rate limits or custom features? 
Visit [anncsu.dataws.it](https://anncsu.dataws.it) or contact us at [info@dataws.it](mailto:info@dataws.it).
