import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  return (
    <s-tile
      heading="QC Card & Pin"
      subheading=""
      onClick={() => shopify.action.presentModal()}
    />
  );
}