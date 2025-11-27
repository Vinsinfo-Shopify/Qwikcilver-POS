// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [isGiftCard, setIsGiftCard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIfGiftCard();
  }, []);

  const checkIfGiftCard = async () => {
    try {
      const result = await shopify.productSearch.fetchProductWithId(shopify.cartLineItem.productId);
      const hasGiftCardTag = result?.tags?.some(tag => tag.toLowerCase() === 'qc_giftcard');
      setIsGiftCard(hasGiftCardTag);
    } catch (error) {
      console.error('Error checking product:', error);
      setIsGiftCard(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <s-text>Loading...</s-text>;
  }

  if (!isGiftCard) {
    return <s-text>Not a Gift Card product</s-text>;
  }

  return (
    <>
      <s-button onClick={() => shopify.action.presentModal()} />
    </>
  );
}