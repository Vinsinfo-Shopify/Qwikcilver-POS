// @ts-nocheck
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  generateHashHeaders,
  getAPIEndpoint,
  scanUsingBarcode,
  getCurrencySymbol
} from "../../global";

export default () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [walletBalance, setWalletBalance] = useState("0");
  const [gCode, setGCode] = useState("");
  const [barCode, setBarCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const shopDomain = shopify.session.currentSession.shopDomain;
  const APIEndpoint = getAPIEndpoint();

  // ✅ USE STATE — NOT cart.current.value — for UI decision
  const hasCustomer = Boolean(customer);

  async function fetchWalletBalance(customerId) {
    try {
      const headers = await generateHashHeaders(customerId, shopDomain);
      const response = await fetch(
        `${APIEndpoint}/giftcard/wallet/balance?store=${shopDomain}&customer_id=${customerId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ store: shopDomain })
        }
      );
      return await response.json();
    } catch {
      return null;
    }
  }

  async function addWalletBalance() {
    try {
      const headers = await generateHashHeaders(customer, shopDomain);

      const response = await fetch(
        `${APIEndpoint}/giftcard/wallet/addgiftcard`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            store: shopDomain,
            customer_id: customer,
            ...(isNaN(gCode)
              ? { gc_pin: gCode }
              : { gc_number: gCode, TrackData: barCode })
          })
        }
      );

      const data = await response.json();

      if (!data?.success) {
        shopify.toast.show(data?.message || "Invalid Code!");
        return;
      }

      const balance = await fetchWalletBalance(customer);
      setWalletBalance(balance?.data?.balance || 0);
      setGCode("");
      shopify.toast.show("Added!");
    } catch {
      shopify.toast.show("Invalid Code!");
    }
  }

  // ✅ Initial load + POS-safe customer detection
  useEffect(() => {
    const loadBalance = async () => {
      setIsLoading(true);

      const cart = shopify?.cart?.current?.value;
      const customerId = cart?.customer?.id || null;

      if (!customerId) {
        setCustomer(null);
        setIsLoading(false);
        return;
      }

      setCustomer(customerId);
      const balance = await fetchWalletBalance(customerId);
      setWalletBalance(balance?.data?.balance || 0);

      setIsLoading(false);
    };

    loadBalance();
  }, []);

  // ✅ Barcode / swipe handling
  // useEffect(() => {
  //   if (
  //     gCode.length === 26 ||
  //     gCode.length === 31 ||
  //     gCode.length === 32 ||
  //     (gCode.includes(";") && gCode.includes("=") && gCode.includes("?"))
  //   ) {
  //     const value = scanUsingBarcode(gCode);
  //     setBarCode(gCode);
  //     setGCode(value);
  //     if(gCode.includes(';') && gCode.includes('=') && gCode.includes('?')){
  //       setBarCode(gCode.replace(/[;?]/g, ""));
  //     }
  //   }
  // }, [gCode]);

  return (
    <s-box padding="small">
      {hasCustomer ? (
        <>
          <s-text>
            Your Wallet Balance is{" "}
            {getCurrencySymbol(shopify.session.currentSession.currency)}{" "}
            {walletBalance}
          </s-text>

          <s-divider />

          <s-text-field
            placeholder="Enter Pin"
            value={gCode}
            onInput={(e) => setGCode(e.target.value)}
          />

          <s-button
            variant="primary"
            onClick={addWalletBalance}
            disabled={!gCode || isLoading}
          >
            Add Balance
          </s-button>
        </>
      ) : (
        <s-text>Select or Add the customer!</s-text>
      )}
    </s-box>
  );
};
