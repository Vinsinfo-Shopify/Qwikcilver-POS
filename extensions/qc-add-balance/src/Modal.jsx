// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import CryptoJS from "crypto-js";

export default () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [walletBalance, setWalletBalance] = useState("0");
  const [gCode, setGCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const secretKey = "zyuief7tyzq0ic8";
  const shopDomain = "bonjovi-claimcode-prod-plus.myshopify.com";

  function generateHashHeaders(customerId) {
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

  async function fetchWalletBalance(customerId) {
    try {
      const headers = generateHashHeaders(customerId);
      const response = await fetch(
        `https://backend.qwikcilver.com/giftcard/wallet/balance?store=${shopDomain}&customer_id=${customerId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ store: shopDomain })
        }
      );
      const data = await response.json();
      return data;
    } catch {
      return null;
    }
  }

  async function addWalletBalance() {
    try {
      const headers = generateHashHeaders(customer);

      const response = await fetch(
        `https://backend.qwikcilver.com/giftcard/wallet/addgiftcard`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            store: shopDomain,
            customer_id: customer,
            gc_pin: gCode
          })
        }
      );

      const data = await response.json();

      if (!data?.success) {
        shopify.toast.show(data?.message || "Invalid Code!");
        return data;
      }

      const balance = await fetchWalletBalance(customer);
      setWalletBalance(balance?.data?.balance || 0);
      setGCode('');
      shopify.toast.show("Added!");
      return data;

    } catch {
      shopify.toast.show("Invalid Code!");
      return null;
    }
  }

  useEffect(() => {
    const loadBalance = async () => {
      setIsLoading(true);
      const cart = shopify?.cart?.current?.value;
      if (cart?.customer?.id) {
        setCustomer(cart.customer.id);
        const balance = await fetchWalletBalance(cart.customer.id);
        setWalletBalance(balance?.data?.balance || 0);
      }
      setIsLoading(false);
    };
    loadBalance();
  }, []);

  return (
    <>
      {customer ? (
        <s-box padding="small">
          <s-text>Your Wallet Balance is {walletBalance}</s-text>
          <s-divider />
          <s-text-field
            placeholder="Enter Pin"
            value={gCode}
            onInput={(e) => setGCode(e.target.value)}
          />
          <s-button variant="primary" onClick={addWalletBalance} disabled={!gCode}>
            Add Balance
          </s-button>
        </s-box>
      ) : (
        <s-text>Select or Add the customer!</s-text>
      )}
    </>
  );
};
