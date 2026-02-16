import CryptoJS from "crypto-js";
let secretKey = "zyuief7tyzq0ic8";
let APIEndPoint = "https://devftadashboard.qwikcilver.com";

export function getAPIEndpoint(){
    return APIEndPoint; 
}

export function generateHashHeaders(customerId, shopDomain) {
    const now = new Date();
    const rand1 = (now.getMilliseconds() % 9999) + 1000;
    const rand2 = now.getMilliseconds();
    const randomString = `${rand1}${rand2}`;
    const timestamp = `${customerId}${randomString}${String(customerId).length}`;

    const hashedTimestamp = CryptoJS.HmacSHA256(
        `${customerId}${shopDomain}${randomString}`,
        secretKey
    ).toString();

    return {
        accept: "application/json",
        "content-type": "application/json",
        hash: hashedTimestamp,
        timestamp,
        "x-origin": shopDomain
    };
}

export function preauthGenerateHashHeaders(shopDomain) {
    const now = new Date();
    const rand1 = (now.getMilliseconds() % 9999) + 1000;
    const rand2 = now.getMilliseconds();
    const randomString = `${rand1}${rand2}`;

    const timestamp = `${randomString}00`;

    const hashedTimestamp = CryptoJS.HmacSHA256(
        `00${shopDomain}${randomString}`,
        secretKey
    ).toString();

    return {
        "accept": "application/json",
        "content-type": "application/json",
        "hash": hashedTimestamp,
        "timestamp": timestamp,
        "x-origin": shopDomain
    };
}

export function getCurrencySymbol(code) {
    const symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'JPY': '¥',
        'CAD': 'CA$',
        'AUD': 'A$',
        'CNY': '¥',
        'CHF': 'CHF',
        'SEK': 'kr',
        'NZD': 'NZ$',
        'SGD': 'S$',
        'HKD': 'HK$',
        'NOK': 'kr',
        'MXN': 'MX$',
        'BRL': 'R$',
        'ZAR': 'R',
        'AED': 'د.إ',
        'SAR': '﷼',
    };
    return symbols[code] || code;
};

export function scanUsingBarcode(code) {
    // if (typeof code !== 'string') return '';

    // Case 1: contains ; = ?
    if (code.includes(';') && code.includes('=') && code.includes('?')) {
        const semicolonIndex = code.indexOf(';');
        const equalsIndex = code.indexOf('=');

        if (semicolonIndex !== -1 && equalsIndex !== -1 && equalsIndex > semicolonIndex) {
            return code.substring(semicolonIndex + 1, equalsIndex);
        }
        return '';
    }

    // Case 2: length 26
    if (code.length === 26) {
        const positions = [
            1, 2, 4, 5, 7, 8,
            10, 11, 13, 14,
            16, 17, 19, 20,
            22, 23
        ];

        return positions.map(pos => code[pos] ?? '').join('');
    }

    // Case 3: length 31
    if (code.length === 31) {
        return code.slice(6, -6);
    }

    // Case 4: length 32
    if (code.length === 32) {
        return code.substring(13);
    }

    return '';
}

