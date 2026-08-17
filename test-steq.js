process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const https = require('https');
const querystring = require('querystring');

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function scrapeSTEQ(query) {
  try {
    const init = await request('https://b2bsteq.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    let cookies = [];
    if (init.headers['set-cookie']) {
      init.headers['set-cookie'].forEach(c => cookies.push(c.split(';')[0]));
    }

    const loginData = querystring.stringify({
      UserCode: 'CL0016035',
      UserPassword: 'STEQ484630925',
      UserRemember: 'on',
      UserSubmit: ''
    });

    const login = await request('https://b2bsteq.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginData),
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0'
      }
    }, loginData);

    if (login.headers['set-cookie']) {
      login.headers['set-cookie'].forEach(c => cookies.push(c.split(';')[0]));
    }

    const searchData = querystring.stringify({
      MySearchType: '1',
      MySearchKey: query,
      MySearchSubmit: ''
    });

    let search = await request('https://b2bsteq.com/form-recherche.html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(searchData),
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0'
      }
    }, searchData);

    if (search.statusCode === 302 && search.headers.location) {
      const nextUrl = search.headers.location.startsWith('http') ? search.headers.location : 'https://b2bsteq.com/' + search.headers.location.replace(/^\//, '');
      search = await request(nextUrl, {
        headers: {
          'Cookie': cookies.join('; '),
          'User-Agent': 'Mozilla/5.0'
        }
      });
    }

    const html = search.body;
    console.log("HTML length:", html.length);
    const jsonMatch = html.match(/var ApiJsonItemAll = (\[.*?\]);/);
    if (!jsonMatch) {
      console.log("Regex Failed.");
      return { price: 0, discount: 0, availability: "Non Trouvé" };
    }

    const items = JSON.parse(jsonMatch[1]);
    console.log("Items found:", items.length);
    if (items.length > 0) console.log(items[0]);

    let bestItem = items.find((i) => parseInt(i.Available) > 0) || items[0];

    return {
      price: parseFloat(bestItem.UnitPrice) || 0,
      discount: parseFloat(bestItem.MaxDiscount) || 0,
      availability: parseInt(bestItem.Available) > 0 ? "Disponible" : "Sur Commande",
      rawStock: parseInt(bestItem.Available) || 0,
      name: bestItem.ItemNumberEquiv || bestItem.Name
    };
  } catch (e) {
    console.error("STEQ error:", e);
    return { error: e.message };
  }
}

scrapeSTEQ("1306J5").then(console.log);
