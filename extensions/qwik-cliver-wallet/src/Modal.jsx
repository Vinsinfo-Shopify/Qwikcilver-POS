// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import CryptoJS from 'crypto-js';

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [lineItems, setLineItems] = useState([]);
  const [lineItemCount, setLineItemCount] = useState(0);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [cards, setCards] = useState([{ cardNumber: '', pinNumber: '' }]);
  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(0);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteGiftCard, setDeleteGiftCard] = useState('no');

  const SECRET_KEY = 'zyuief7tyzq0ic8';
  const API_BASE_URL = 'https://devftadashboard.qwikcilver.com';
  const SHOP_DOMAIN = shopify?.session?.currentSession?.shopDomain;  //shopify?.session?.currentSession?.shopDomain;

  useEffect(() => {
    const cart = shopify.cart.current?.value;
    if (cart?.lineItems) {
      setLineItems(cart.lineItems);
      setLineItemCount(cart.lineItems.length);
      setCustomer(cart.customer.id);
      if (cart.lineItems.length === 0) {
        shopify.cart.clearCart();
      }

      const giftExists = cart.lineItems.some(
        item => item.properties && item.properties['Buy for Self']
      );
      setHasGiftProduct(giftExists);
    }
  }, []);

  const handleAddMore = () => {
    if (cards.length < 5) {
      setCards([...cards, { cardNumber: '', pinNumber: '' }]);
    }
  };

  const handleCardChange = (index, field, value) => {
    const updated = [...cards];
    updated[index][field] = value;
    setCards(updated);
  };

  const handleRemoveCard = index => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const generateHashHeaders = () => {
    const now = new Date();
    const rand1 = (now.getMilliseconds() % 9999) + 1000;
    const rand2 = now.getMilliseconds();
    const randomString = `${rand1}${rand2}`;

    const timestamp = `${randomString}00`;

    const hashedTimestamp = CryptoJS.HmacSHA256(
      `00${SHOP_DOMAIN}${randomString}`,
      SECRET_KEY
    ).toString();

    return {
      "accept": "application/json",
      "content-type": "application/json",
      "hash": hashedTimestamp,
      "timestamp": timestamp,
      "x-origin": SHOP_DOMAIN
    };
  };

  const validation = async () => {
    setIsLoading(true);
    try {
      const headers = await generateHashHeaders();

      const response = await fetch(`${API_BASE_URL}/preauth/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shop: SHOP_DOMAIN,
          cards: cards.map(card => ({
            CardNumber: card.cardNumber,
            CardPin: card.pinNumber,
            CurrencyCode: 'INR'
          }))
        })
      });

      const data = await response.json();
      setBalance(data?.data?.balance || 0);
      setShowRedeem(true);
    } catch (error) {
      shopify.toast.show('Failed to validate cards');
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedeem = async () => {
    const amount = Number(redeemAmount);

    if (!amount || amount <= 0) {
      shopify.toast.show('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      shopify.toast.show('Amount exceeds available balance');
      return;
    }

    setIsLoading(true);
    try {
      // Fix: Pass the required parameters to generateHashHeaders
      const headers = generateHashHeaders();


      const cardArray = cards.map(card => ({
        CardNumber: card.cardNumber,
        CardPin: card.pinNumber,
        CurrencyCode: 'INR',
        ExpiryDate: "2026-06-15T16:07:58+05:30",
        Amount: amount
      }));


      const response = await fetch(`${API_BASE_URL}/preauth/preauth`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shop: SHOP_DOMAIN,
          checkoutId: customer,
          cards: cardArray,
          amount: amount
        })
      });

      const data = await response.json();

      if (!data?.success) {
        shopify.toast.show('Redeem failed', data);
        console.error('Redeem failed:', data);
        return;
      }

      shopify.toast.show('Redeemed successfully');
      setGiftCardCode(data?.data?.code || '');
      setAppliedAmount(amount);

    } catch (error) {
      shopify.toast.show('Error applying wallet balance');
      console.error('Redeem error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  function generateHashHeader(customerId) {
    const now = new Date();
    const rand1 = (now.getMilliseconds() % 9999) + 1000;
    const rand2 = now.getMilliseconds();
    const randomString = `${rand1}${rand2}`;
    const timestamp = `${customerId}${randomString}${String(customerId).length}`;
    const hashedTimestamp = CryptoJS.HmacSHA256(
      `${customerId}${SHOP_DOMAIN}${randomString}`,
      secretKey
    ).toString();

    return {
      accept: "application/json",
      "content-type": "application/json",
      hash: hashedTimestamp,
      timestamp,
      "x-origin": SHOP_DOMAIN
    };
  }

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const headers = generateHashHeaders();
      let custId = customer.toString();
      const response = await fetch(`${API_BASE_URL}/preauth/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          store: SHOP_DOMAIN,
          checkoutId: custId,
          customer_id: customer
        })
      });

      const data = await response.json();

      if (data?.success) {
        shopify.toast.show('Gift card removed');
        setGiftCardCode('');
        setAppliedAmount(0);
        setRedeemAmount('');
        setShowRedeem(false);
        setCards([{ cardNumber: '', pinNumber: '' }]);
      } else {
        shopify.toast.show('Failed to cancel');
      }
    } catch (error) {
      shopify.toast.show('Error canceling wallet application');
      console.error('Cancel error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(giftCardCode);
    shopify.toast.show('Copied to clipboard');
  };

  const handleSubmit = async () => {
    await validation();
  };

  return (
    <s-scroll-box>
      <s-box padding="small">
        {lineItemCount !== 0 ? (
          customer ? (
            <>
              {hasGiftProduct ? (
                <s-text>
                  Having gift product in your cart, you can't apply your store credit.
                </s-text>
              ) : (
                <>
                  {deleteGiftCard === 'no' && (
                    <>
                      {!showRedeem ? (
                        <>
                          {cards.map((card, index) => (
                            <s-box
                              key={index}
                              padding="small"
                              style={{
                                marginBottom: '16px',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px'
                              }}
                            >
                              <s-text style={{ fontWeight: 'bold' }}>
                                Card {index + 1}
                              </s-text>

                              <s-text-field
                                label="Card Number"
                                value={card.cardNumber}
                                onInput={e =>
                                  handleCardChange(index, 'cardNumber', e.target.value)
                                }
                              />

                              <s-text-field
                                label="PIN Number"
                                value={card.pinNumber}
                                onInput={e =>
                                  handleCardChange(index, 'pinNumber', e.target.value)
                                }
                              />

                              {cards.length > 1 && (
                                <s-button
                                  style={{ marginTop: '8px' }}
                                  onClick={() => handleRemoveCard(index)}
                                >
                                  Remove Card
                                </s-button>
                              )}
                            </s-box>
                          ))}

                          {cards.length < 5 && (
                            <s-button onClick={handleAddMore}>
                              + Add More Card
                            </s-button>
                          )}

                          <s-button
                            style={{ marginTop: '16px' }}
                            onClick={handleSubmit}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Checking...' : 'Check Balance'}
                          </s-button>
                        </>
                      ) : (
                        <s-box
                          style={{
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            textAlign: 'center'
                          }}
                        >
                          {!giftCardCode ? (
                            <>
                              <s-text style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                Available Balance: ₹{balance}
                              </s-text>

                              <s-text style={{ marginTop: '12px' }}>
                                Enter amount you want to redeem
                              </s-text>

                              <s-text-field
                                placeholder="Enter amount"
                                value={redeemAmount}
                                onInput={e => setRedeemAmount(e.target.value)}
                                style={{ marginTop: '12px' }}
                              />

                              <s-button
                                style={{ marginTop: '16px' }}
                                onClick={handleRedeem}
                                disabled={isLoading || !redeemAmount}
                              >
                                {isLoading ? 'Redeeming...' : 'Redeem Now'}
                              </s-button>
                            </>
                          ) : (
                            <>
                              <s-text style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                Applied Amount: ₹{appliedAmount}
                              </s-text>

                              <s-box style={{ marginTop: '16px' }}>
                                <s-text style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                  Gift Card Code
                                </s-text>

                                <s-text-field
                                  value={giftCardCode}
                                  readonly
                                  placeholder="Your gift card code"
                                />

                                <s-button
                                  variant="secondary"
                                  style={{ marginTop: '8px' }}
                                  onClick={handleCancel}
                                  disabled={isLoading}
                                >
                                  {isLoading ? 'Canceling...' : 'Cancel'}
                                </s-button>
                              </s-box>
                            </>
                          )}
                        </s-box>
                      )}
                    </>
                  )}

                  {!showRedeem && (
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
              )}
            </>
          ) : (
            <s-text>Select or Add the customer!</s-text>
          )
        ) : (
          <s-text>Your cart is empty! Add some products.</s-text>
        )}
      </s-box>
    </s-scroll-box>
  );
};