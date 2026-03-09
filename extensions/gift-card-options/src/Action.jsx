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

  // Image template options
  const images = [
    {
      name: 'Best Wishes',
      images: [
        'https://qcnewbucket.s3.ap-south-1.amazonaws.com/TemplateAssets/1_48.jpg'
      ]
    },
    {
      name: 'Birthday Wish',
      images: [
        'https://qcnewbucket.s3.ap-south-1.amazonaws.com/TemplateAssets/2_48.jpg'
      ]
    },
    {
      name: 'Wedding Wish',
      images: [
        'https://qcnewbucket.s3.ap-south-1.amazonaws.com/TemplateAssets/6.jpg'
      ]
    }
  ];

  const [selectedImage, setSelectedImage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('Best Wishes');
  const [selectedTemplateImage, setSelectedTemplateImage] = useState(images[0].images);
  const [restrictCart, setRestrictCart] = useState("false");


  const handleTemplateChange = (e) => {
    const templateName = e.target.values[0];
    setSelectedTemplate(templateName);
    const templateImages = images.find(item => item.name === templateName)?.images || [];
    setSelectedTemplateImage(templateImages);
    // Reset selected image when template changes
    setSelectedImage('');
  };


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
     delete props['Send as Gift'];
     delete props["Buy for Self"];
    if (isShowBuySelf === 'true') {
      if (buySelf === "true") {
        delete props["_Qc_sender_name"];
        delete props["_Qc_recipient_name"];
        delete props["_Qc_recipient_email"];
        delete props["_Qc_recipient_message"];
        delete props["_Qc_gift_later"];
        delete props["_Qc_scheduled_date_time"];
        delete props["_Qc_img_url"];
        props["Buy for Self"] = 'Yes';
      } else {
        props['Send as Gift'] = "Yes";
        props["_Qc_sender_name"] = fromName;
        props["_Qc_recipient_name"] = recipientName;
        props["_Qc_recipient_email"] = recipientEmail;
        props["_Qc_recipient_message"] = wishMessage;
        props["_Qc_img_url"] = selectedImage;
        if (showDate === "true") {
          delete props["_Qc_gift_later"];
          props["_Qc_scheduled_date_time"] = formatTimeDate(giftDate, giftTime);
        } else {
          props["_Qc_gift_later"] = "Yes";
        }
      }
    } else {
      props['Send as Gift'] = "Yes";
      props["_Qc_sender_name"] = fromName;
      props["_Qc_recipient_name"] = recipientName;
      props["_Qc_recipient_email"] = recipientEmail;
      props["_Qc_recipient_message"] = wishMessage;
      props["_Qc_img_url"] = selectedImage;
      if (showDate === "true") {
        delete props["_Qc_gift_later"];
        props["_Qc_scheduled_date_time"] = formatTimeDate(giftDate, giftTime);
      } else {
        props["_Qc_gift_later"] = "Yes";
      }
    }
    shopify.cart.addLineItemProperties(currentLineItem.uuid, props);
    if (buySelf === "true") {
      shopify.toast.show("For added safety & convenience, the Gift Card will be added to your Shopify account.");
    }else{
      shopify.toast.show("E-Gift Cards are typically delivered instantly or at the scheduled time. However, in rare cases due to system delays, delivery may take up to 24 to 48 hours.");
    }

  };

  function formatTimeDate(date, time) {
    if (!date || !time) return null;
    const combinedDateTime = `${date}T${time}`;
    const local = new Date(combinedDateTime);

    if (isNaN(local)) return null;

    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    const hours = String(local.getHours()).padStart(2, '0');
    const minutes = String(local.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }


  useEffect(() => {
    const props = currentLineItem.properties || {};
    // if (props["Buy for Self"] !== undefined) {
    //   setBuySelf(props["Buy for Self"] === "Yes" ? "true" : "false");
    // }
    if([props['Send as Gift']]  != ''){
      setBuySelf("false");
    }
    if([props['Buy for Self']] != ''){
      setBuySelf("true");
    }
    if (props["_Qc_sender_name"] !== undefined) setFromName(props["_Qc_sender_name"]);
    if (props["_Qc_recipient_name"]) setRecipientName(props["_Qc_recipient_name"]);
    if (props["_Qc_recipient_email"]) setRecipientEmail(props["_Qc_recipient_email"]);
    if (props["_Qc_recipient_message"]) setWishMessage(props["_Qc_recipient_message"]);
    // if (props["_Qc_img_url"]) setSelectedImage(props["_Qc_img_url"]);
    if (props["_Qc_img_url"]) {
      const savedImageUrl = props["_Qc_img_url"];
      setSelectedImage(savedImageUrl);
      
      // Find which template contains this image
      const templateWithImage = images.find(template => 
        template.images.includes(savedImageUrl)
      );
      
      if (templateWithImage) {
        setSelectedTemplate(templateWithImage.name);
        setSelectedTemplateImage(templateWithImage.images);
      }
    }
    if (props["_Qc_gift_later"]) {
      setShowDate(props["_Qc_gift_later"] === "Yes" ? "false" : "true");
    }
    if (props["_Qc_scheduled_date_time"]) {
      const iso = props["_Qc_scheduled_date_time"];
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

      const value = specificMetafield?.node?.value ?? 'true';
      setIsShowBuySelf(value);
    }
    getProductInfo();
    getAllTags();
  }, []);

  async function getAllTags() {
    const cartProducts = shopify.cart.current?.value?.lineItems || [];

    // Fetch all products in parallel
    const products = await Promise.all(
      cartProducts.map(item =>
        shopify.productSearch.fetchProductWithId(item.productId)
      )
    );

    // Collect + normalize tags
    const allTags = products
      .flatMap(product => product?.tags || [])
      .map(tag => tag.toLowerCase());

    var qcGiftcardCount = allTags.join(',').split('qc_giftcard').length - 1;
    var physicalQcGcCount = allTags.join(',').split('physical_qc_gc').length - 1;

    if (physicalQcGcCount) {
      if (qcGiftcardCount !== physicalQcGcCount) {
        setRestrictCart("true");
      }
    }
  }

  const isValid = () => {
    if (buySelf === "true" && isShowBuySelf === 'true') return true;
    if (!fromName) return false;
    if (!recipientName) return false;
    if (!recipientEmail) return false;
    if (!selectedImage) return false;
    if (showDate === "true" && (!giftDate || !giftTime)) return false;
    return true;
  };

  if(restrictCart == "true"){
    return(
      <s-page>
        <s-text>You can't purchase both physical and digital gift products in the same cart. Please remove one of them.</s-text>
      </s-page>
    )
  }

  return (
    <s-page heading="Update Gift card details">
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

                <s-text type='strong'>Choose a Gift Card Template</s-text>
                <s-choice-list values={[selectedTemplate]} onChange={handleTemplateChange}>
                  {images.map((template, index) => (
                    <s-choice key={index} value={template.name} selected={selectedTemplate === template.name}>
                      {template.name}
                    </s-choice>
                  ))}
                </s-choice-list>
                
                <s-text type='strong'>Choose a Gift Card Image</s-text>
                <s-choice-list values={[selectedImage]} onChange={e => setSelectedImage(e.target.values[0])}>
                  {selectedTemplateImage.map((imageUrl, index) => (
                    <s-choice key={index} value={imageUrl} selected={selectedImage === imageUrl}>
                      <s-image src={imageUrl} inlineSize="auto"/>
                    </s-choice>
                  ))}
                </s-choice-list>

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