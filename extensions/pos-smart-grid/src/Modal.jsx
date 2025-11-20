// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [lineItems, setLineItems] = useState([]);
  const [lineItemCount, setLineItemCount] = useState(0);
  const [hasGiftProduct, setHasGiftProduct] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [pinNumber, setPinNumber] = useState('');

  useEffect(() => {
    const cart = shopify.cart.current?.value;
    if (cart && cart.lineItems) {
      setLineItems(cart.lineItems);
      setLineItemCount(cart.lineItems.length);
      
      const giftExists = cart.lineItems.some(item => 
        item.properties && item.properties['Buy for Self']
      );
      setHasGiftProduct(giftExists);
    }
  }, []);

  const handleSubmit = () => {
    console.log('Card Number:', cardNumber);
    console.log('PIN Number:', pinNumber);
  };

  return (
    <>      
      <s-box padding="small">
        {hasGiftProduct ? (
          <s-text>Having gift product in your cart you can't apply your store credit money</s-text>
        ) : (
          <>
            <s-text-field
              label="Card Number"
              placeholder='Enter Card Number'
              value={cardNumber}
              required
              onInput={e => setCardNumber(e.target.value)}
            />

            <s-text-field
              label="PIN Number"
              placeholder='Enter PIN Number'
              value={pinNumber}
              required
              onInput={e => setPinNumber(e.target.value)}
            />

            <s-button
              heading="My App"
              subheading="Call cart function"
              onClick={handleSubmit}
            >
              Check Balance
            </s-button>
          </>
        )}
      </s-box>
    </>
  );
};