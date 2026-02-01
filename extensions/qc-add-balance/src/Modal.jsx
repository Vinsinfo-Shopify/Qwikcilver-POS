// @ts-nocheck
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { generateHashHeaders, getAPIEndpoint, scanUsingBarcode} from "../../global";

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

  let isBarCodeValue = false;

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
      const data = await response.json();
      return data;
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
            ...(isNaN(gCode) ? 
            { gc_pin: gCode } : 
            { gc_number: gCode,
              TrackData: barCode
             })
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

  useEffect(() => {
    const loadBalance = async () => {
      setIsLoading(true);
      const cart = shopify?.cart?.current?.value;

      if (cart.customer.id) {
        setCustomer(cart.customer.id);
        const balance = await fetchWalletBalance(cart.customer.id);
        setWalletBalance(balance?.data?.balance || 0);
      }

      setIsLoading(false);
    };

    loadBalance();
  }, []);

    useEffect(() => {
    let value = scanUsingBarcode(gCode);

    if(gCode.length === 26 || gCode.length === 31 || gCode.length === 32){
      setBarCode(gCode);
      setGCode(value);
    };
  }, [gCode]);

  return (
    <s-box padding="small">
      {customer ? (
        <>
          <s-text>Your Wallet Balance is {getCurrencySymbol(shopify.session.currentSession.currency)} {walletBalance}</s-text>
          <s-divider />
          <s-text-field
            placeholder="Enter Pin / Scan barcode / Swipe card"
            value={gCode}
            onInput={(e) => setGCode(e.target.value)}
          />
          <s-button variant="primary" onClick={addWalletBalance} disabled={!gCode}>
            Add Balance
          </s-button>
        </>
      ) : (
        <s-text>Select or Add the customer!</s-text>
      )}
    </s-box>
  );
};
