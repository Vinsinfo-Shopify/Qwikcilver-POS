// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const cart = shopify?.cart?.current?.value;
    if (cart?.customer?.id) {
      setCustomer(cart.customer.id);
    }
  }, []);


  return (
    <>
      {customer ? (
        <s-box padding="small">
          <s-text>Your Wallet Balance is {walletBalance}</s-text>
          <s-divider />
          <s-text-field
            placeholder="Enter Card Number"
            value=''
            required
          />

          <s-text-field
            placeholder="Enter Pin Number"
            value=''
            required
          />

          <s-button variant="primary">
            Add Balance
          </s-button>
        </s-box>
      ) : (
        <s-text>Select or Add the customer!</s-text>
      )}
    </>
  );
};
