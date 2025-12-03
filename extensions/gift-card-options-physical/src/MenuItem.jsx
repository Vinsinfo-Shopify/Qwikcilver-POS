// @ts-nocheck
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [isGiftCard, setIsGiftCard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkIfGiftCard = async () => {
      try {
        const lineItem = shopify?.cartLineItem;

        if (!lineItem?.productId) {
          setIsGiftCard(false);
          setLoading(false);
          return;
        }

        const result = await shopify.productSearch.fetchProductWithId(
          lineItem.productId
        );

        const tags = result?.tags?.map(t => t.toLowerCase()) || [];

        const hasBoth =
          tags.includes("qc_giftcard") &&
          tags.includes("physical_qc_gc");

        setIsGiftCard(hasBoth);
      } catch (error) {
        console.error("Error checking product:", error);
        setIsGiftCard(false);
      } finally {
        setLoading(false);
      }
    };

    checkIfGiftCard();
  }, []);

  if (loading) return <s-text>Loading...</s-text>;

  if (!isGiftCard) return <s-text>Not a Gift Card product</s-text>;

  return (
    <s-button onClick={() => shopify.action.presentModal()}>
      Redeem Gift Card
    </s-button>
  );
}
