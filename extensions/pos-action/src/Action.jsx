// @ts-nocheck
import { render } from 'preact';
import { useState } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [buySelf, setBuySelf] = useState('true');
  const [showDate, setShowDate] = useState("true");
  const [fromName, setFromName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [wishMessage, setWishMessage] = useState('');
  const [giftDate, setGiftDate] = useState('');
  const [giftTime, setGiftTime] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [cardType, setCardType] = useState('physical');

  const handleSubmit = () => {
    const lineItemProperties = {
      'Buy for Self': buySelf == 'true' ? 'Yes' : 'No',
    };
    lineItemProperties['Gift Card Type'] = cardType;

    if (buySelf != 'true') {
      lineItemProperties['Qc_sender_name'] = fromName;
      lineItemProperties['Qc_recipient_name'] = recipientName;
      lineItemProperties['Qc_recipient_email'] = recipientEmail;
      lineItemProperties['Qc_recipient_message'] = wishMessage;
      lineItemProperties['Send Instantly'] = showDate != 'true' ? 'Yes' : 'No';

      if (showDate == 'true') {
        const formattedTimeDate = formatTimeDate(giftDate, giftTime);
        lineItemProperties['Qc_scheduled_date_time'] = formattedTimeDate || 'Not selected';
      }

    }

    shopify.cart.addLineItemProperties(shopify.cartLineItem.uuid, lineItemProperties);
  };

  function formatTimeDate(date, time) {
    if (!date || !time) return null;

    const local = new Date(`${date}T${time}`);

    return local.toISOString();
  }
  const search = async () => {
    try {
      const results = await shopify.productSearch.fetchProductVariantWithId(
        shopify.cartLineItem.variantId
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  return (
    <s-page heading="Gift Card Options">
      <s-scroll-box>
        <s-box padding="small">

          <s-choice-list onChange={e => setBuySelf(e.target.values[0])}>
            <s-choice value="true" selected>
              Buy for Self
            </s-choice>
            <s-choice value="false">
              Send as Gift
            </s-choice>
          </s-choice-list>
          {buySelf != 'true' && (
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

              <s-text type='strong'>Your Wishes!</s-text>
              <s-text-area
                placeholder='Enter your message here!'
                value={wishMessage}
                onInput={e => setWishMessage(e.target.value)}
              />

              <s-text type='strong'>Schedule date and time</s-text>
              <s-choice-list onChange={e => setShowDate(e.target.values[0])}>
                <s-choice value="true" selected>
                  Select date and time
                </s-choice>
                <s-choice value="false">
                  Send the gift card instantly
                </s-choice>
              </s-choice-list>

              {showDate == 'true' && (
                <>
                  <s-button command="--show" commandFor="date-picker">
                    Select Date
                  </s-button>
                  <s-date-picker
                    id="date-picker"
                    value={giftDate}
                    onChange={e => setGiftDate(e.target.value)}
                  />

                  <s-button command="--show" commandFor="time-picker">
                    Select Time
                  </s-button>
                  <s-time-picker
                    id="time-picker"
                    value={giftTime}
                    onChange={e => setGiftTime(e.target.value)}
                  />
                </>
              )}
            </>
          )}
          <s-text>
            Select Gift Card Type
          </s-text>
          <s-choice-list onChange={e => setCardType(e.target.values[0])}
          >
            <s-choice value="physical" selected>
              Physical
            </s-choice>
            <s-choice value="digital">
              Digital
            </s-choice>
          </s-choice-list>
        </s-box>
      </s-scroll-box>

      <s-button
        heading="My App"
        subheading="Call cart function"
        onClick={handleSubmit}
      >
        Update Line Item
      </s-button>
    </s-page>
  );
}