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
  const [isLoading, setIsLoading] = useState(false);
  const [hideCD, setHideCD] = useState("true");

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
      setIsLoading(true);

      const headers = generateHashHeaders(customer, shopDomain);

      const payload =
        gPin.length === 26 || gPin.length === 31 || gPin.length === 32
          ? { TrackData: gPin, gc_number: gNumber }
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
    } finally {
      setIsLoading(false);
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

  // useEffect(() => {
  //   if (!gNumber) return;

  //   const pin = scanUsingBarcode(gNumber);
  //   if (pin) {
  //     setGPin(pin);
  //     if(gNumber.includes(';') && gNumber.includes('=') && gNumber.includes('?') || gNumber.length > 25){
  //       // setGNumber(gNumber.replace(/[;?]/g, ""));
  //       setGPin(gNumber);
  //       setGNumber(pin);
  //     }
  //   }
  // }, [gNumber]);

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
            placeholder="Enter Card Number"
            value={gNumber}
            onInput={(e) => setGNumber(e.target.value)}
            required
          />

          <s-text-field
            placeholder="Enter Pin Number"
            value={'*'.repeat(gPin.length)}
            onInput={e => {
              const inputValue = e.target.value.replace(/•/g, '');
              const previousLength = gPin.length;

              if (inputValue.length > previousLength) {
                // Characters added (typing or paste)
                const addedChars = inputValue.slice(previousLength);
                setGPin(gPin + addedChars);
              } else {
                // Characters removed (backspace)
                setGPin(gPin.slice(0, inputValue.length));
              }
            }}
            required
          />

          <s-button
            variant="primary"
            onClick={addWalletBalance}
            disabled={!gNumber || !gPin || isLoading}
          >
            {isLoading ? "Adding..." : "Add Balance"}
          </s-button>
        </>
      ) : (
        <s-text>Select or Add the customer!</s-text>
      )}
    </s-box>
  );
};