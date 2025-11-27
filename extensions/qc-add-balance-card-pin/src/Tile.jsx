import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {
  return (
    <s-tile
      heading="QC Add balance - Card Pin"
      subheading=""
      onClick={() => shopify.action.presentModal()}
    />
  );
}