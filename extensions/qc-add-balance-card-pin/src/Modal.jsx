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
  const [walletBalance, setWalletBalance] = useState(0);
  const [gNumber, setGNumber] = useState("");
  const [gPin, setGPin] = useState("");

  const shopDomain = shopify.session.currentSession.shopDomain;
  const APIEndpoint = getAPIEndpoint();

  /* -------------------- API HELPERS -------------------- */

  const fetchWalletBalance = async (customerId) => {
    try {
      const headers = generateHashHeaders(customerId, shopDomain);
      const res = await fetch(
        `${APIEndpoint}/giftcard/wallet/balance?store=${shopDomain}&customer_id=${customerId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ store: shopDomain })
        }
      );
      return await res.json();
    } catch (err) {
      return null;
    }
  };

  const addWalletBalance = async () => {
    try {
      const headers = generateHashHeaders(customer, shopDomain);

      const payload =
        gNumber.length === 26 || gNumber.length === 31 || gNumber.length === 32
          ? { TrackData: gNumber, gc_number: gPin }
          : { gc_number: gNumber, gc_pin: gPin };

      const res = await fetch(
        `${APIEndpoint}/giftcard/wallet/addgiftcard`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            store: shopDomain,
            customer_id: customer,
            ...payload
          })
        }
      );

      const data = await res.json();

      if (!data?.success) {
        shopify.toast.show(data?.message || "Invalid Code!");
        return;
      }

      const balanceRes = await fetchWalletBalance(customer);
      setWalletBalance(balanceRes?.data?.balance || 0);

      setGNumber("");
      setGPin("");

      shopify.toast.show("Added!");
    } catch (err) {
      shopify.toast.show("Invalid Code!");
    }
  };

  /* -------------------- INIT CUSTOMER -------------------- */

  useEffect(() => {
    const init = async () => {
      const cart = shopify?.cart?.current?.value;
      const customerId = cart?.customer?.id;

      if (!customerId) return;

      setCustomer(customerId);

      const balanceRes = await fetchWalletBalance(customerId);
      setWalletBalance(balanceRes?.data?.balance || 0);
    };

    init();
  }, []);

  /* -------------------- BARCODE AUTO PIN -------------------- */

  useEffect(() => {
    if (!gNumber) return;

    const pin = scanUsingBarcode(gNumber);
    if (pin) {
      setGPin(pin);
      if(gNumber.includes(';') && gNumber.includes('=') && gNumber.includes('?') || gNumber.length > 25){
        // setGNumber(gNumber.replace(/[;?]/g, ""));
        setGPin(gNumber);
        setGNumber(pin);
      }
    }
  }, [gNumber]);

  /* -------------------- UI -------------------- */

  return (
    <s-box padding="small">
      {customer ? (
        <>
          <s-text>
            Your Wallet Balance is{" "}
            {getCurrencySymbol(
              shopify.session.currentSession.currency
            )}{" "}
            {walletBalance}
          </s-text>

          <s-divider /> 

          <s-text-field
            placeholder="Enter Card Number / Scan barcode / Swipe card"
            value={gNumber}
            onInput={(e) => setGNumber(e.target.value)}
            required
          />

          <s-text-field
            placeholder="Enter Pin Number"
            value={gPin && ((gPin.includes(';') &&
              gPin.includes('=') &&
              gPin.includes('?')) ||
              gPin.length > 25
            )
              ? '*'.repeat(gPin.length)
              : gPin}
            onInput={(e) => setGPin(e.target.value)}
            required
          />

          <s-button
            variant="primary"
            onClick={addWalletBalance}
            disabled={!gNumber || !gPin}
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
