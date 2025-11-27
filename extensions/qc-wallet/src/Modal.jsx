// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [walletBalance, setWalletBalance] = useState(200);
  const [showCancel, setShowCancel] = useState(false);
  const [gCode, setGCode] = useState('');

  useEffect(() => {
    const cart = shopify.cart.current?.value;
    if (!cart?.lineItems) return;

    setLineItems(cart.lineItems);
    setCustomer(cart?.customer?.id);

    if (cart.lineItems.length === 0) {
      shopify.cart.clearCart();
    }

    setHasGiftProduct(
      cart.lineItems.some(item => item.properties?.['Buy for Self'])
    );
  }, []);

  const applyBalance = () => {
    setWalletBalance(0);
    shopify.toast.show("Copy the Gift card code!");
    setGCode("CODE2025");
    setShowCancel(true);
  };

  const cancel = () => {
    setWalletBalance(200);
    shopify.toast.show("Removed");
    setShowCancel(false);
  };

  const isCartEmpty = lineItems.length === 0;

  return (
    <>
      <s-box padding="small">
        {!isCartEmpty ? (
          hasGiftProduct ? (
            <s-text>
              Having gift product in your cart you can't apply your store credit
              money
            </s-text>
          ) : customer ? (
            <>
              <s-text>Your Wallet Balance is {walletBalance}</s-text>
              <s-divider />
              {!showCancel ? (
                <s-button variant="primary" onClick={applyBalance}>
                  Apply
                </s-button>
              ) : (
                <>
                  <s-text-field placeholder="Drag and copy it" value={gCode} />
                  <s-button
                    variant="secondary"
                    disabled={!gCode}
                    onClick={cancel}
                  >
                    Cancel
                  </s-button>
                </>
              )}
            </>
          ) : (
            <s-text>Select or Add the customer!</s-text>
          )
        ) : (
          <s-text>Your cart is empty! Add some products.</s-text>
        )}
      </s-box>
    </>
  );
};
