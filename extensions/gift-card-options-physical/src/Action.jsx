// @ts-nocheck
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

async function queryProductMetafields(productId) {
  const requestBody = {
    query: `#graphql
      query GetProduct($id: ID!) {
        product(id: $id) {
          metafields(first: 250) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }
    `,
    variables: { id: `gid://shopify/Product/${productId}` },
  };
  const res = await fetch('shopify:admin/api/graphql.json', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  return res.json();
}

function Extension() {
  const currentLineItem = shopify.cartLineItem;
  const [buySelf, setBuySelf] = useState('true');
  const [cardNumber, setCardNumber] = useState('');
  const [isShowBuySelf, setIsShowBuySelf] = useState('loading');

  const handleSubmit = () => {
    const props = {};
    if (isShowBuySelf === 'true') {
      props["Buy for Self"] = buySelf === "true" ? "Yes" : "No";
      props["Qc_card_number"] = cardNumber;
      if (buySelf === "true") {
        props["Qc_recipient_message"] = "";
      } else {
        props["Qc_recipient_message"] = wishMessage;
      }
    } else {
      props["Buy for Self"] = "No";
      props["Qc_card_number"] = cardNumber;
      props["Qc_recipient_message"] = wishMessage;
    }
    shopify.cart.addLineItemProperties(currentLineItem.uuid, props);
    shopify.toast.show("Updated");
  };

  useEffect(() => {
    const props = currentLineItem.properties || {};
    if (props["Buy for Self"] !== undefined) {
      setBuySelf(props["Buy for Self"] === "Yes" ? "true" : "false");
    }
    if (props["Qc_card_number"]) setCardNumber(props["Qc_card_number"]);
    async function getProductInfo() {
      const result = await queryProductMetafields(shopify.cartLineItem.productId);
      const metafields = result?.data?.product?.metafields?.edges ?? [];

      const specificMetafield = metafields.find(
        (item) =>
          item.node.namespace === "global" &&
          item.node.key === "ShowBuyForSelfButton"
      );

      const value = specificMetafield?.node?.value ?? null;
      setIsShowBuySelf(value);
    }
    getProductInfo();
  }, []);

  const isValid = () => {
    if (!cardNumber) return false;
    return true;
  };

  return (
    <s-page heading="Gift Card Options - Physical">
      <s-scroll-box>
        {isShowBuySelf === 'loading' ? (
          <s-box padding="small">
            <s-text>Loading...</s-text>
          </s-box>
        ) : (
          <s-box padding="small">
            {isShowBuySelf === 'true' && (
              <s-choice-list values={[buySelf]} onChange={e => setBuySelf(e.target.values[0])}>
                <s-choice value="true" selected={buySelf === 'true'}>Buy for Self</s-choice>
                <s-choice value="false" selected={buySelf === 'false'}>Send as Gift</s-choice>
              </s-choice-list>
            )}
            <s-text type='strong'>Card Number</s-text>
            <s-number-field
              placeholder='Enter Card Number'
              value={cardNumber}
              required
              onInput={e => setCardNumber(e.target.value)}
            />

          </s-box>
        )}
      </s-scroll-box>

      <s-button
        heading="My App"
        subheading="Call cart function"
        onClick={handleSubmit}
        disabled={!isValid()}
      >
        Update Line Item
      </s-button>
    </s-page>
  );
}