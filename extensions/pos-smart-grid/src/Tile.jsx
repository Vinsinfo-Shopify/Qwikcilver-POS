import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  return (
    <s-tile
      heading="QwikCliver Wallet"
      subheading=""
      onClick={() => shopify.action.presentModal()}
    />
  );
}