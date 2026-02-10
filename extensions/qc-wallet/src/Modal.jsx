// @ts-nocheck
import { render } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import { generateHashHeaders, getAPIEndpoint } from "../../global";

const shopDomain = shopify?.session?.currentSession?.shopDomain;
const API_BASE_URL = getAPIEndpoint();
const GRAPHQL_BATCH_SIZE = 250;

async function queryProductsBatch(productIds) {
  if (!productIds?.length) return null;

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify({
      query: `#graphql
        query GetProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              tags
            }
          }
        }
      `,
      variables: {
        ids: productIds.map((id) => `gid://shopify/Product/${id}`)
      }
    })
  });

  if (!res.ok) throw new Error(`GraphQL error: ${res.status}`);
  return res.json();
}

async function fetchAllProductTags(productIds) {
  const allProducts = [];

  for (let i = 0; i < productIds.length; i += GRAPHQL_BATCH_SIZE) {
    const batch = productIds.slice(i, i + GRAPHQL_BATCH_SIZE);
    const result = await queryProductsBatch(batch);

    if (result?.data?.nodes) {
      allProducts.push(...result.data.nodes.filter(Boolean));
    }
  }
  return allProducts;
}

const api = {
  async fetchWalletBalance(cid) {
    try {
      const headers = generateHashHeaders(cid, shopDomain);
      const res = await fetch(
        `${API_BASE_URL}/giftcard/wallet/balance?store=${shopDomain}&customer_id=${cid}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ store: shopDomain })
        }
      );
      const data = await res.json();
      return data?.data?.balance || 0;
    } catch {
      return 0;
    }
  },

  async applyWallet(cid, amount) {
    const headers = generateHashHeaders(cid, shopDomain);
    const res = await fetch(`${API_BASE_URL}/preauth/preauth`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shop: shopDomain,
        checkoutId: cid,
        amount,
        cards: [{ CardNumber: cid }]
      })
    });

    const data = await res.json();
    shopify.toast.show(data.data);
    return data?.data?.code || null;
  },

  async cancelWallet(cid) {
    const headers = generateHashHeaders(cid, shopDomain);
    const res = await fetch(`${API_BASE_URL}/preauth/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        store: shopDomain,
        checkoutId: cid.toString(),
        customer_id: cid
      })
    });
    return res.json();
  }
};

const Extension = () => {
  const [customer, setCustomer] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [giftCode, setGiftCode] = useState("");
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteGiftCard, setDeleteGiftCard] = useState("no");
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  var hasAppliedCode = Boolean(giftCode);
  const isCartEmpty = lineItems.length === 0;

  const BASE_URL = 'https://unstriped-unimportuned-campbell.ngrok-free.dev';

  async function capturePosGc(shop, customerId, giftCardCode) {
    const response = await fetch(`${BASE_URL}/giftcard/capturePosGc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, customerId, giftCardCode })
    });

    const data = await response.json();
    return data.success;
  }

  async function getPosGc(shop, customerId) {
    const response = await fetch(`${BASE_URL}/giftcard/getPosGc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, customerId })
    });

    const data = await response.json();
    if (data.giftCardCode) {
      setGiftCode(data.giftCardCode);
      shopify.toast.show("Copy the existing gift card code!");
    }
    return data;
  }

  async function cancelPosGc(shop, customerId) {
    const response = await fetch(`${BASE_URL}/giftcard/cancelPosGc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop, customerId })
    });

      const data = await response.json();
      return data.success;
  }

  const refreshBalance = useCallback(async (cid) => {
    if (cid) {
      const bal = await api.fetchWalletBalance(cid);
      setWalletBalance(bal);
    }
  }, []);


  useEffect(() => {
    const init = async () => {
      const cart = shopify?.cart?.current?.value;
      if (!cart) {
        setIsLoadingTags(false);
        return;
      }

      const items = cart.lineItems || [];
      setLineItems(items);

      const total = items.reduce(
        (sum, i) => sum + i.quantity * parseFloat(i.price || 0),
        0
      );
      setCartTotal(total);

      if (!items.length) {
        shopify.cart.clearCart();
        setIsLoadingTags(false);
        return;
      }

      const cid = cart?.customer?.id;
      setCustomer(cid);
      refreshBalance(cid);
      getPosGc(shopDomain, cid);
      try {
        setIsLoadingTags(true);
        const pIds = items.map((i) => i.productId || i.id).filter(Boolean);
        if (!pIds.length) {
          setIsLoadingTags(false);
          return;
        }

        const products = await fetchAllProductTags(pIds);

        let containsGift = false;
        products.forEach((p) => {
          if (p?.tags?.includes("qc_giftcard")) containsGift = true;
        });

        setHasGiftProduct(containsGift);
      } catch {
        setHasGiftProduct(false);
      } finally {
        setIsLoadingTags(false);
      }
    };

    init();
  }, [refreshBalance]);

  const handleApply = async () => {
    if (walletBalance <= 0) {
      shopify.toast.show("No available wallet balance.");
      return;
    }

    const amount = Math.min(walletBalance, cartTotal);
    setIsLoading(true);

    try {
      const code = await api.applyWallet(customer, amount);
      if (code) {
        setGiftCode(code);
        setAppliedAmount(amount);
        refreshBalance(customer);
        capturePosGc(shopDomain, customer, code);
        shopify.toast.show("Gift card code generated!");
      } else {
        shopify.toast.show("Failed to generate gift card code.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const res = await api.cancelWallet(customer);
      if (res) {
        if (res?.success) {
          shopify.toast.show("Gift card removed");
          setGiftCode("");
          setAppliedAmount(0);
          setDeleteGiftCard("no");
          refreshBalance(customer);
          cancelPosGc(shopDomain, customer);
        }else{
          if (res.key == 'noActiveSession') {
            shopify.toast.show('No active session found!');
          } else {
            shopify.toast.show('Failed to cancel');
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isCartEmpty) return <s-text>Your cart is empty!</s-text>;
    if (isLoadingTags) return <s-text>Loading product info...</s-text>;
    if (hasGiftProduct)
      return <s-text>Gift products prevent applying store credit.</s-text>;
    if (!customer) return <s-text>Select or add a customer!</s-text>;

    const amount = Math.min(walletBalance, cartTotal);

    return (
      <>
        {deleteGiftCard === "no" && (
          <>
            <s-text>Wallet Balance: {walletBalance.toFixed(2)}</s-text>
            <s-text>Cart Total: {cartTotal.toFixed(2)}</s-text>
            {!hasAppliedCode && (
              <s-text>Amount to Apply: {amount.toFixed(2)}</s-text>
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
                <s-text-field value={giftCode} readonly />
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
            <s-text>Need to cancel the added gift card?</s-text>
            <s-choice-list
              values={[deleteGiftCard]}
              onChange={(e) => setDeleteGiftCard(e.target.values[0])}
            >
              <s-choice value="yes">Yes</s-choice>
              <s-choice value="no">No</s-choice>
            </s-choice-list>
          </s-box>
        )}

        {deleteGiftCard === "yes" && (
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

  return <s-box padding="small">{renderContent()}</s-box>;
};

export default () => {
  render(<Extension />, document.body);
};
