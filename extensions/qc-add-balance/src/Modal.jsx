// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [gCode, setGCode] = useState("");

  useEffect(() => {
    const cart = shopify?.cart?.current?.value;
    if (cart?.customer?.id) {
      setCustomer(cart.customer.id);
    }
  }, []);

  const applyBalance = async () => {
    if (gCode === "CODE2025") {
      await shopify.toast.show("Added!");
      setWalletBalance(1000);
    } else {
      await shopify.toast.show("Invalid Code!");
    }

    setGCode("");
  };


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

          <s-button variant="primary" onClick={applyBalance} disabled={!gCode}>
            Add Balance
          </s-button>
        </s-box>
      ) : (
        <s-text>Select or Add the customer!</s-text>
      )}
    </>
  );
};
