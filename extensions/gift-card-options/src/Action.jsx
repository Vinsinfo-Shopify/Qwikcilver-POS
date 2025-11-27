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
  const [showDate, setShowDate] = useState("true");
  const [fromName, setFromName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [giftDate, setGiftDate] = useState('');
  const [giftTime, setGiftTime] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isShowBuySelf, setIsShowBuySelf] = useState('loading');

  const validateEmail = (value) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(value)) return "Please enter a valid email address";
    return "";
  };

  const handleSubmit = () => {
    const error = validateEmail(recipientEmail);
    setEmailError(error);
    if (error && buySelf !== "true") return;
    const props = {};
    if (isShowBuySelf === 'true') {
      props["Buy for Self"] = buySelf === "true" ? "Yes" : "No";
      if (buySelf === "true") {
        props["Qc_sender_name"] = "";
        props["Qc_recipient_name"] = "";
        props["Qc_recipient_email"] = "";
        props["Qc_recipient_message"] = "";
        props["Send Instantly"] = "";
        props["Qc_scheduled_date_time"] = "";
      } else {
        props["Qc_sender_name"] = fromName;
        props["Qc_recipient_name"] = recipientName;
        props["Qc_recipient_email"] = recipientEmail;
        props["Qc_recipient_message"] = wishMessage;
        if (showDate === "true") {
          props["Send Instantly"] = "No";
          props["Qc_scheduled_date_time"] = formatTimeDate(giftDate, giftTime);
        } else {
          props["Send Instantly"] = "Yes";
        }
      }
    } else {
      props["Buy for Self"] = "No";
      props["Qc_sender_name"] = fromName;
      props["Qc_recipient_name"] = recipientName;
      props["Qc_recipient_email"] = recipientEmail;
      props["Qc_recipient_message"] = wishMessage;
      if (showDate === "true") {
        props["Send Instantly"] = "No";
        props["Qc_scheduled_date_time"] = formatTimeDate(giftDate, giftTime);
      } else {
        props["Send Instantly"] = "Yes";
      }
    }
    shopify.cart.addLineItemProperties(currentLineItem.uuid, props);
    shopify.toast.show("Updated");
  };


  function formatTimeDate(date, time) {
    if (!date || !time) return null;
    const local = new Date(`${date}T${time}`);
    return local.toISOString();
  }

  useEffect(() => {
    const props = currentLineItem.properties || {};
    if (props["Buy for Self"] !== undefined) {
      setBuySelf(props["Buy for Self"] === "Yes" ? "true" : "false");
    }
    if (props["Qc_sender_name"] !== undefined) setFromName(props["Qc_sender_name"]);
    if (props["Qc_recipient_name"]) setRecipientName(props["Qc_recipient_name"]);
    if (props["Qc_recipient_email"]) setRecipientEmail(props["Qc_recipient_email"]);
    if (props["Qc_recipient_message"]) setWishMessage(props["Qc_recipient_message"]);
    if (props["Send Instantly"]) {
      setShowDate(props["Send Instantly"] === "Yes" ? "false" : "true");
    }
    if (props["Qc_scheduled_date_time"]) {
      const iso = props["Qc_scheduled_date_time"];
      const d = new Date(iso);
      if (!isNaN(d)) {
        setGiftDate(iso.split("T")[0]);
        setGiftTime(iso.split("T")[1]?.slice(0, 5));
      }
    }
    async function getProductInfo() {
      const result = await queryProductMetafields(shopify.cartLineItem.productId);
      const metafields = result?.data?.product?.metafields?.edges ?? [];

      const specificMetafield = metafields.find(
        (item) =>
          item.node.namespace === "global" &&
          item.node.key === "ShowBuyForSelfButton"
      );

      const value = specificMetafield?.node?.value ?? 'null';
      setIsShowBuySelf(value);
    }
    getProductInfo();
  }, []);

  const isValid = () => {
    if (buySelf === "true" && isShowBuySelf === 'true') return true;
    if (!fromName) return false;
    if (!recipientName) return false;
    if (!recipientEmail) return false;
    if (showDate === "true" && (!giftDate || !giftTime)) return false;
    return true;
  };

  return (
    <s-page heading="Gift Card Options">
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
            {(buySelf != 'true' || isShowBuySelf === 'false') && (
              <>
                <s-text type='strong'>From</s-text>
                <s-text-field
                  placeholder='Enter sender name'
                  value={fromName}
                  required
                  onInput={e => setFromName(e.target.value)}
                />
                <s-text type='strong'>To</s-text>
                <s-text-field
                  placeholder='Enter recipient name'
                  value={recipientName}
                  required
                  onInput={e => setRecipientName(e.target.value)}
                />
                <s-email-field
                  value={recipientEmail}
                  required
                  placeholder='Enter recipient email'
                  onInput={e => setRecipientEmail(e.target.value)}
                />
                {emailError && (
                  <s-text>
                    {emailError}
                  </s-text>
                )}
                <s-text type='strong'>Your Wishes!</s-text>
                <s-text-area
                  placeholder='Enter your message here!'
                  value={wishMessage}
                  onInput={e => setWishMessage(e.target.value)}
                />
                <s-text type='strong'>Schedule date and time</s-text>
                <s-choice-list values={[showDate]} onChange={e => setShowDate(e.target.values[0])}>
                  <s-choice value="true" selected={showDate === 'true'}>Select date and time</s-choice>
                  <s-choice value="false" selected={showDate === 'false'}>Send the gift card instantly</s-choice>
                </s-choice-list>

                {showDate == 'true' && (
                  <>
                    <s-button command="--show" commandFor="date-picker">{giftDate ? giftDate : 'Date'}</s-button>
                    <s-date-picker
                      id="date-picker"
                      value={giftDate}
                      onChange={e => setGiftDate(e.target.value)}
                    />
                    <s-button command="--show" commandFor="time-picker">{giftTime ? giftTime : 'Time'}</s-button>
                    <s-time-picker
                      id="time-picker"
                      value={giftTime}
                      onChange={e => setGiftTime(e.target.value)}
                    />
                  </>
                )}
              </>
            )}

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