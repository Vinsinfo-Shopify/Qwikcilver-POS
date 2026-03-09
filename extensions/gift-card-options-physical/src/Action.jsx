// @ts-nocheck
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { scanUsingBarcode } from "../../global";

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
  const [restrictCart, setRestrictCart] = useState("false");
  const [hideCD, setHideCD] = useState("true");

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

  const handleTemplateChange = (e) => {
    const templateName = e.target.values[0];
    setSelectedTemplate(templateName);
    const templateImages = images.find(item => item.name === templateName)?.images || [];
    setSelectedTemplateImage(templateImages);
    // Reset selected image when template changes
    setSelectedImage('');
  };

  const handleSubmit = () => {
    const props = {};
    if (isShowBuySelf === 'true') {
      // props['Send as Gift'] = '';
      // props["Buy for Self"] = '';
      props["_Qc_card_number"] = cardNumber;
      if (buySelf === "true") {
        // props["_Qc_recipient_message"] = "";
        delete props["_Qc_img_url"];
        // props["Buy for Self"] = 'Yes';
      } else {
        // props['Send as Gift'] = "Yes";
        props["_Qc_img_url"] = selectedImage;
        // props["Qc_recipient_message"] = wishMessage;
      }
    } else {
      // props['Send as Gift'] = "Yes";
      props["_Qc_card_number"] = cardNumber;
      props["_Qc_img_url"] = selectedImage;
      // props["Qc_recipient_message"] = wishMessage;
    }
    shopify.cart.addLineItemProperties(currentLineItem.uuid, props);
    shopify.toast.show("Updated");
  };

  useEffect(() => {
    const props = currentLineItem.properties || {};
    // if([props['Send as Gift']] != ''){
    //   setBuySelf("false");
    // }
    // if([props['Buy for Self']] != ''){
    //   setBuySelf("true");
    // }
    if (props["_Qc_card_number"]) setCardNumber(props["_Qc_card_number"]);
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


    async function getProductInfo() {
      const result = await queryProductMetafields(shopify.cartLineItem.productId);
      const metafields = result?.data?.product?.metafields?.edges ?? [];

      const specificMetafield = metafields.find(
        (item) =>
          item.node.namespace === "global" &&
          item.node.key === "ShowBuyForSelfButton"
      );

      const value = specificMetafield?.node?.value ?? 'false'; // FIX: fallback to 'false' instead of null
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
    if (!cardNumber) return false;
    if (buySelf === 'false' && !selectedImage) return false;
    return true;
  };

  const CardNumberSet = (value) => {
    if (value.startsWith(';')) {
      setHideCD("true");
    }else{
      setHideCD("false");
    }
    if((value.includes(';') && value.includes('=') && value.includes('?')) || value.length > 25){
      setCardNumber(scanUsingBarcode(value));
      setHideCD("false");
    } else {
      setCardNumber(value);
    }
  }

  if (restrictCart == "true") {
    return (
      <s-page>
        <s-text>You can't purchase both physical and digital gift products in the same cart. Please remove one of them.</s-text>
      </s-page>
    )
  }

  return (
    <s-page heading="Enter Gift card details">
      <s-stack gap="small" direction="inline" justifyContent="center">
        <s-badge tone="success">Note:Before placing the order, ensure the cart is set to 'Ship all items.'</s-badge>
      </s-stack>
      <s-scroll-box>
        {isShowBuySelf === 'loading' ? (
          <s-box padding="small">
            <s-text>Loading...</s-text>
          </s-box>
        ) : (
          <s-box padding="small">
            {/* {isShowBuySelf === 'true' && (
              <s-choice-list values={[buySelf]} onChange={e => setBuySelf(e.target.values[0])}>
                <s-choice value="true" selected={buySelf === 'true'}>Buy for Self</s-choice>
                <s-choice value="false" selected={buySelf === 'false'}>Send as Gift</s-choice>
              </s-choice-list>
            )} */}
            <s-text type='strong'>Enter Card Number</s-text>
                <s-text-field
                  placeholder='Enter Card Number'
                  value={hideCD == "true" ? '*'.repeat(cardNumber.length) : cardNumber}
                  required
                  onPaste={e => {
                    if (hideCD == "true") {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const newChars = pastedText.replace(/\D/g, '');
                      if (newChars) {
                        CardNumberSet(cardNumber + newChars);
                      }
                    }
                  }}
                  onInput={e => {
                    const inputValue = e.target.value;

                    if (hideCD == "true") {
                      const currentLength = cardNumber.length;

                      if (inputValue.length > currentLength) {
                        const newChars = inputValue.slice(currentLength).replace(/\*/g, '');
                        if (newChars) {
                          CardNumberSet(cardNumber + newChars);
                        } else {
                          e.target.value = '*'.repeat(currentLength);
                        }
                      } else {
                        CardNumberSet(cardNumber.slice(0, inputValue.length));
                      }
                    } else {
                      CardNumberSet(inputValue);
                    }
                  }}
                />
            {buySelf == 'false' && isShowBuySelf === 'true' && (
              <>
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
                      <s-image src={imageUrl} inlineSize="auto" />
                    </s-choice>
                  ))}
                </s-choice-list>
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