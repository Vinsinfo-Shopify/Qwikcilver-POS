// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { generateHashHeaders, preauthGenerateHashHeaders, getCurrencySymbol, scanUsingBarcode, getAPIEndpoint } from "../../global";

const GRAPHQL_BATCH_SIZE = 250; // Shopify GraphQL nodes query limit

async function queryProductsBatch(productIds) {
  if (!productIds || productIds.length === 0) return null;

  const requestBody = {
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
      ids: productIds.map(id => `gid://shopify/Product/${id}`)
    },
  };

  const res = await fetch('shopify:admin/api/graphql.json', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  return res.json();
}


async function fetchAllProductTags(productIds) {
  const allProducts = [];
  
  // Split into batches of 250 (Shopify limit)
  for (let i = 0; i < productIds.length; i += GRAPHQL_BATCH_SIZE) {
    const batch = productIds.slice(i, i + GRAPHQL_BATCH_SIZE);
    const batchNum = Math.floor(i / GRAPHQL_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(productIds.length / GRAPHQL_BATCH_SIZE);
    
    console.log(`Fetching batch ${batchNum}/${totalBatches}: ${batch.length} products`);
    
    const result = await queryProductsBatch(batch);
    
    if (result?.data?.nodes) {
      allProducts.push(...result.data.nodes.filter(Boolean));
    }
  }
  
  return allProducts;
}

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [lineItems, setLineItems] = useState([]);
  const [lineItemCount, setLineItemCount] = useState(0);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [cards, setCards] = useState([{ cardNumber: '', pinNumber: '', balance: '' }]);
  const [customer, setCustomer] = useState(null);
  const [balance, setBalance] = useState(0);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteGiftCard, setDeleteGiftCard] = useState('no');
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [productTags, setProductTags] = useState([]);
  const [ressss, setResss] = useState('');
  const [cartTotal, setCartTotal] = useState(0);

  
  const API_BASE_URL = getAPIEndpoint();
  const SHOP_DOMAIN = shopify?.session?.currentSession?.shopDomain;

  useEffect(() => {
    const initialize = async () => {
      const cart = shopify.cart.current?.value;
      
      if (!cart?.lineItems) {
        setIsLoadingTags(false);
        return;
      }

      const items = cart.lineItems;

      const total = items.reduce(
        (sum, i) => sum + i.quantity * parseFloat(i.price || 0),
        0
      );
      setCartTotal(total);
      setLineItems(items);
      setLineItemCount(items.length);
      setCustomer(cart.customer?.id);
      getPosGc(SHOP_DOMAIN, cart.customer?.id);

      if (items.length === 0) {
        shopify.cart.clearCart();
        setIsLoadingTags(false);
        return;
      }

      // Check for gift product based on properties
      const giftExists = items.some(
        item => item.properties && item.properties['Buy for Self']
      );

      // Fetch product tags with batching support
      try {
        setIsLoadingTags(true);
        console.log('=== Fetching Product Tags ===');
        
        const productIds = items
          .map(item => item.productId || item.id)
          .filter(Boolean);
        
        if (productIds.length === 0) {
          setHasGiftProduct(giftExists)
          
          setIsLoadingTags(false);
          return;
        }

        console.log(`Total products: ${productIds.length}`);
        
        const products = await fetchAllProductTags(productIds);
        
        const allTags = [];
        let hasQcGiftCard = false;
        
        products.forEach((product) => {
          if (product?.tags) {
            allTags.push({
              productId: product.id,
              productTitle: product.title || 'Unknown Product',
              tags: product.tags
            });
            
            // Check for qc_giftcard tag
            if (product.tags.includes('qc_giftcard')) {
              hasQcGiftCard = true;
            }
          }
        });
        
        setProductTags(allTags);
        // Set hasGiftProduct to true if either property exists OR qc_giftcard tag is found
        setHasGiftProduct(giftExists || hasQcGiftCard);

      } catch (error) {
        console.error('Error fetching product tags:', error);
        setHasGiftProduct(giftExists);
      } finally {
        setIsLoadingTags(false);
      }
    };

    initialize();
  }, []);


    async function capturePosGc(shop, customerId, giftCardCode) {
      const response = await fetch(`${API_BASE_URL}/giftcard/capturePosGc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, customerId, giftCardCode })
      });

      const data = await response.json();
      return data.success;
    }

    async function getPosGc(shop, customerId) {
      const response = await fetch(`${BASAPI_BASE_URLE_URL}/giftcard/getPosGc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, customerId })
      });

      const data = await response.json();
      if (data.giftCardCode) {
        setGiftCardCode(data.giftCardCode);
        setShowRedeem(true);
        shopify.toast.show("Copy the existing gift card code!");
      }
      return data;
    }

    async function cancelPosGc(shop, customerId) {
      const response = await fetch(`${API_BASE_URL}/giftcard/cancelPosGc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, customerId })
      });

        const data = await response.json();
        return data.success;
    }

  const handleAddMore = () => {
    if (cards.length < 5) {
      setCards([...cards, { cardNumber: '', pinNumber: '' }]);
    }
  };

  const handleCardChange = (index, field, value) => {
    const updated = [...cards];
    updated[index][field] = value;

    if ( field === "cardNumber" && (value.length === 26 || value.length === 31 || value.length === 32 || (value.includes(';') && value.includes('=') && value.includes('?')))) {
      const extractedValue = scanUsingBarcode(value);
      updated[index]["pinNumber"] = value;
      updated[index]["cardNumber"] = extractedValue;
      // if(value.includes(';') && value.includes('=') && value.includes('?')){
      //   updated[index]["pinNumber"] = value;
      //   updated[index]["cardNumber"] = extractedValue;
      // }else{
      //   updated[index]["pinNumber"] = extractedValue;
      // }
    }

    setCards(updated);
  };


  const handleRemoveCard = index => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };


  const validation = async () => {
    setIsLoading(true);
    try {
      const headers = await generateHashHeaders(customer, SHOP_DOMAIN);

      const response = await fetch(`${API_BASE_URL}/preauth/validate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shop: SHOP_DOMAIN,
          cards: cards.map(card => {
            if ((card.pinNumber.includes(';') && card.pinNumber.includes('=') && card.pinNumber.includes('?')) || (card.pinNumber.length > 25) ) {
              return {
                CardNumber: card.cardNumber,
                TrackData: card.pinNumber,
                CurrencyCode: shopify.session.currentSession.currency
              };
            } else {
              return {
                CardNumber: card.cardNumber,
                CardPin: card.pinNumber,
                CurrencyCode: shopify.session.currentSession.currency
              };
            }
          })
        })
      });

      const data = await response.json();
      if(data.data.cards.length){
      setCards(data.data.cards
        .map(card => ({
          cardNumber: card.CardNumber,
          pinNumber: card.CardPin || card.TrackData,
          balance: card.Balance
        }))
        .sort((a, b) => b.balance - a.balance)); 
        
      }else{
        setCards([{ cardNumber: '', pinNumber: '', balance: '' }]);
      }

     if (!data?.success) {
        shopify.toast.show(data?.message || "Invalid Code!");
        return;
      }

      if(data?.data?.balance == 0){
        shopify.toast.show("No amount associated with this card. Please check your details.")
      }else{
        setBalance(data?.data?.balance);
        setShowRedeem(true);
      }
    } catch (error) {
      shopify.toast.show('Failed to validate cards');
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  function generateExpiryDate() {
      const expiryDate = new Date();

      // Add 6 months instead of 2 years
      expiryDate.setMonth(expiryDate.getMonth() + 2);

      const year = expiryDate.getFullYear();
      const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
      const day = expiryDate.getDate().toString().padStart(2, '0');
      const hours = expiryDate.getHours().toString().padStart(2, '0');
      const minutes = expiryDate.getMinutes().toString().padStart(2, '0');
      const seconds = expiryDate.getSeconds().toString().padStart(2, '0');
      const offset = "+05:30";  // Adjust to your timezone offset if needed

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
  }

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
      const headers = preauthGenerateHashHeaders(SHOP_DOMAIN);

      // Distribute amount across cards sequentially
      let remainingAmount = amount;

      const cardArray = cards.map(card => {
        if (remainingAmount <= 0) return null;

        const cardAmount = Math.min(card.balance, remainingAmount);
        remainingAmount -= cardAmount;

        if ((card.pinNumber.includes(';') && card.pinNumber.includes('=') && card.pinNumber.includes('?') || card.pinNumber.length > 25)) {
          return {
            CardNumber: card.cardNumber,
            TrackData: card.pinNumber,
            CurrencyCode: shopify.session.currentSession.currency,
            ExpiryDate: generateExpiryDate(),
            Amount: cardAmount
          };
        }
        // if (card.cardNumber.length > 25) {
        //   return {
        //     CardNumber: card.pinNumber,
        //     TrackData: card.cardNumber,
        //     CurrencyCode: shopify.session.currentSession.currency,
        //     ExpiryDate: "2026-06-15T16:07:58+05:30",
        //     Amount: amount
        //   };
        // }

        return {
          CardNumber: card.cardNumber,
          CardPin: card.pinNumber,
          CurrencyCode: shopify.session.currentSession.currency,
          ExpiryDate: generateExpiryDate(),
          Amount: cardAmount
        };
      }).filter(card => card !== null);

      setResss(cardArray);

      if (amount >= cartTotal) {
        shopify.toast.show('Redeem amount is more than cart total');
        return;
      }

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
        if(data.key == 'balanceAlreadyApplied'){
            shopify.toast.show('Your gift card balance has already been applied, kindly retry after 30 minutes to apply a new redemption amount');
        } 

        if(data.key == 'internalServerError'){
            shopify.toast.show('Redeem failed');
        }
        
        console.error('Redeem failed:', data);
        backButton();
        return;
      }

      shopify.toast.show('Redeemed successfully');
      setGiftCardCode(data?.data?.code || '');
      setAppliedAmount(amount);
      capturePosGc(SHOP_DOMAIN, customer, data?.data?.code);

    } catch (error) {
      shopify.toast.show('Error applying wallet balance!!');
      console.error('Redeem error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const backButton = async () => {
      setShowRedeem(false); 
      setRedeemAmount('');
      setAppliedAmount(0);
      setGiftCardCode('');
  }

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const headers = generateHashHeaders(customer, SHOP_DOMAIN);
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
        setDeleteGiftCard('no');
        cancelPosGc(SHOP_DOMAIN, customer);
      } else {
        if(data.key == 'noActiveSession'){
          shopify.toast.show('No active session found!');
        }else{
          shopify.toast.show('Failed to cancel');
        }
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
{/* <s-text>{ressss ? JSON.stringify(ressss, null, 2) : 'errorred...'}</s-text> */}
      <s-box padding="small">
        {lineItemCount !== 0 ? (
          isLoadingTags ? (
            <s-text>Loading product information...</s-text>
          ) : customer ? (
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
                                label="Enter Card Number / Scan barcode / Swipe card"
                                value={card.cardNumber}
                                onInput={e =>
                                  handleCardChange(index, 'cardNumber', e.target.value)
                                }
                              />

                                <s-text-field
                                  label="PIN Number"
                                  value={'*'.repeat(card.pinNumber.length)}
                                  onPaste={e => {
                                    e.preventDefault();
                                    const pastedText = e.clipboardData.getData('text');
                                    const newChars = pastedText.replace(/\D/g, '');
                                    if (newChars) {
                                      handleCardChange(index, 'pinNumber', card.pinNumber + newChars);
                                    }
                                  }}
                                  onInput={e => {
                                    const inputValue = e.target.value;
                                    const currentLength = card.pinNumber.length;

                                    if (inputValue.length > currentLength) {
                                      // Only take chars that aren't asterisks (newly typed)
                                      const newChars = inputValue.slice(currentLength).replace(/\*/g, '');
                                      if (newChars) {
                                        handleCardChange(index, 'pinNumber', card.pinNumber + newChars);
                                      } else {
                                        // Force re-render to snap back to masked value
                                        e.target.value = '*'.repeat(currentLength);
                                      }
                                    } else {
                                      handleCardChange(index, 'pinNumber', card.pinNumber.slice(0, inputValue.length));
                                    }
                                  }}
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
                                Available Balance: {getCurrencySymbol(shopify.session.currentSession.currency)} {balance}
                              </s-text>

                              <s-text>Cart Total: {cartTotal.toFixed(2)}</s-text>

                              <s-text style={{ marginTop: '12px' }}>
                                Enter amount you want to redeem
                              </s-text>

                              <s-number-field
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

                              <s-button
                                style={{ marginTop: '16px' }}
                                onClick={backButton}
                              >
                                Back
                              </s-button>
                            </>
                          ) : (
                            <>
                              {appliedAmount != "0" && <s-text style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                Applied Amount: {getCurrencySymbol(shopify.session.currentSession.currency)} {appliedAmount}
                              </s-text>}

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

                  {/* {!showRedeem && (
                  <s-box padding="small">
                    <s-text>Need to cancel the added gift card?</s-text>
                    <s-choice-list values={[deleteGiftCard]} onChange={e => setDeleteGiftCard(e.target.values[0])}>
                      <s-choice value="yes" selected={deleteGiftCard === 'yes'}>Yes</s-choice>
                      <s-choice value="no" selected={deleteGiftCard === 'no'}>No</s-choice>
                    </s-choice-list>
                  </s-box>
                  )} */}

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