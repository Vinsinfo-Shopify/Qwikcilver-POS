// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import CryptoJS from "crypto-js";

export default () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showCancel, setShowCancel] = useState(false);
  const [gCode, setGCode] = useState('');

  const secretKey = "zyuief7tyzq0ic8";
  const shopDomain = shopify.session.currentSession.shopDomain;

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
      return await response.json();
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const cart = shopify?.cart?.current?.value;
      if (!cart) return;

      setLineItems(cart.lineItems || []);

      if (cart.lineItems?.length === 0) {
        shopify.cart.clearCart();
      }

      const custId = cart?.customer?.id;
      setCustomer(custId || null);

      setHasGiftProduct(
        cart.lineItems?.some(item => item.properties?.['Buy for Self']) || false
      );

      if (custId) {
        const balanceRes = await fetchWalletBalance(custId);
        setWalletBalance(balanceRes?.data?.balance || 0);
      }
    };

    initialize();
  }, []);

  const applyBalance = () => {
    if (walletBalance <= 0) {
      shopify.toast.show("No available wallet balance.");
      return;
    }

    shopify.toast.show("Copy the Gift card code!");
    setGCode("CODE2025");
    setWalletBalance(0);
    setShowCancel(true);
  };

  const cancel = () => {
    setWalletBalance(200);
    setShowCancel(false);
    setGCode("");
    shopify.toast.show("Removed");
  };

  const isCartEmpty = lineItems.length === 0;

  return (
    <s-box padding="small">
      {!isCartEmpty ? (
        hasGiftProduct ? (
          <s-text>
            Having gift product in your cart you can't apply your store credit money
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
                <s-text-field value={gCode} placeholder="Drag and copy it" />
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
  );
};
