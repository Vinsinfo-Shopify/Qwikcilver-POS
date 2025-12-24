// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import CryptoJS from "crypto-js";

const SHOP_DOMAIN = shopify?.session?.currentSession?.shopDomain; 
const SECRET_KEY = "zyuief7tyzq0ic8";
const API_BASE_URL = "https://devftadashboard.qwikcilver.com";

const generateHashHeaders = (customerId) => {
  const now = new Date();
  const rand1 = (now.getMilliseconds() % 9999) + 1000;
  const rand2 = now.getMilliseconds();
  const randomString = `${rand1}${rand2}`;
  const timestamp = `${customerId}${randomString}${String(customerId).length}`;

  const hashedTimestamp = CryptoJS.HmacSHA256(
    `${customerId}${SHOP_DOMAIN}${randomString}`,
    SECRET_KEY
  ).toString();

  return {
    accept: "application/json",
    "content-type": "application/json",
    hash: hashedTimestamp,
    timestamp,
    "x-origin": SHOP_DOMAIN
  };
};


const api = {
  async fetchWalletBalance(customerId) {
    try {
      const headers = generateHashHeaders(customerId);
      const response = await fetch(
        `${API_BASE_URL}/giftcard/wallet/balance?store=${SHOP_DOMAIN}&customer_id=${customerId}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ store: SHOP_DOMAIN })
        }
      );
      const data = await response.json();
      return data?.data?.balance || 0;
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
      return 0;
    }
  },

  async applyWallet(customerId, amount) {
    try {
      const headers = generateHashHeaders(customerId);
      const response = await fetch(
        `${API_BASE_URL}/preauth/preauth`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            shop: SHOP_DOMAIN,
            checkoutId: customerId,
            amount: amount,
            cards: [{ CardNumber: customerId }]
          })
        }
      );
      const data = await response.json();
      shopify.toast.show(data.data);
      return data?.data?.code || null;
    } catch (error) {
      console.error("Failed to apply wallet:", error);
      throw error;
    }
  }
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [giftCode, setGiftCode] = useState('');
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteGiftCard, setDeleteGiftCard] = useState('no');

  const hasAppliedCode = Boolean(giftCode);
  const isCartEmpty = lineItems.length === 0;

  const refreshBalance = useCallback(async (customerId) => {
    if (!customerId) return;
    const balance = await api.fetchWalletBalance(customerId);
    setWalletBalance(balance);
  }, []);

  async function cancelWallet(customerId) {
    try {
      const headers = await generateHashHeaders(customerId);
      let custId = customerId.toString();
      const response = await fetch(
        `${API_BASE_URL}/preauth/cancel`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            store: SHOP_DOMAIN,
            checkoutId: custId,
            customer_id: customerId
          })
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to cancel wallet:", error);
      throw error;
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const cart = shopify?.cart?.current?.value;
      if (!cart) return;

      setLineItems(cart.lineItems || []);
      
      const total = cart.lineItems?.reduce((sum, item) => {
        return sum + (item.quantity * parseFloat(item.price || 0));
      }, 0) || 0;
      setCartTotal(total);

      if (cart.lineItems?.length === 0) {
        shopify.cart.clearCart();
      }

      const custId = cart?.customer?.id;
      setCustomer(custId);

      setHasGiftProduct(
        cart.lineItems?.some(item => item.properties?.['Buy for Self']) || false
      );

      if (custId) {
        await refreshBalance(custId);
      }
    };

    initialize();
  }, [refreshBalance]);

  const handleApply = async () => {
    if (walletBalance <= 0) {
      shopify.toast.show("No available wallet balance.");
      return;
    }

    const amountToApply = Math.min(walletBalance, cartTotal);

    setIsLoading(true);
    try {
      const code = await api.applyWallet(customer, amountToApply);
      if (code) {
        setGiftCode(code);
        setAppliedAmount(amountToApply);
        await refreshBalance(customer);
        shopify.toast.show("Gift card code generated! Copy it below.");
      } else {
        shopify.toast.show("Failed to generate gift card code.");
      }
    } catch (error) {
      shopify.toast.show("Error applying wallet balance.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      let response = await cancelWallet(customer);
      if(response){
        shopify.toast.show("Gift card removed");
      }else{
        shopify.toast.show("Gift card not removed");
      }
      setGiftCode('');
      setAppliedAmount(0);
      await refreshBalance(customer);
    } catch (error) {
      shopify.toast.show("Error canceling wallet application.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isCartEmpty) {
      return <s-text>Your cart is empty! Add some products.</s-text>;
    }

    if (hasGiftProduct) {
      return (
        <s-text>
          Having a gift product in your cart prevents applying store credit.
        </s-text>
      );
    }

    if (!customer) {
      return <s-text>Select or add a customer!</s-text>;
    }

    const amountToApply = Math.min(walletBalance, cartTotal);

    return (
      <>
        {deleteGiftCard === 'no' && (
        <>
        <s-text>Wallet Balance: {walletBalance.toFixed(2)}</s-text>
        <s-text>Cart Total: {cartTotal.toFixed(2)}</s-text>
        {!hasAppliedCode && (
          <s-text>Amount to Apply: {amountToApply.toFixed(2)}</s-text>
        )}
        <s-divider />

        {!hasAppliedCode ? (
          <s-button 
            variant="primary" 
            onClick={handleApply}
            disabled={isLoading || walletBalance <= 0}
          >
            {isLoading ? "Applying..." : "Apply Wallet Balance"}
          </s-button>
        ) : (
          <>
            <s-text>Applied Amount: {appliedAmount.toFixed(2)}</s-text>
            <s-text-field 
              value={giftCode} 
              placeholder="Copy your gift card code" 
              readonly
            />
            <s-button
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {isLoading ? "Canceling..." : "Cancel"}
            </s-button>
          </>
        )}
        </>
        )}

        {!hasAppliedCode && (
        <s-box padding="small">
          <s-text>Need to cancel the created gift card?</s-text>
          <s-choice-list values={[deleteGiftCard]} onChange={e => setDeleteGiftCard(e.target.values[0])}>
            <s-choice value="yes" selected={deleteGiftCard === 'yes'}>Yes</s-choice>
            <s-choice value="no" selected={deleteGiftCard === 'no'}>No</s-choice>
          </s-choice-list>
        </s-box>
        )}

        {deleteGiftCard === 'yes' && (
          <s-button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading ? "Canceling..." : "Cancel the gift card"}
          </s-button>
        )}
      </>
    );
  };

  return (
    <s-box padding="small">
      {renderContent()}
    </s-box>
  );
};

export default () => {
  render(<Extension />, document.body);
};