import {render} from 'preact';
import {useState, useEffect} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {
  const [scanData, setScanData] = useState('');
  const [scanSource, setScanSource] = useState('');
  const [hasCameraScanner, setHasCameraScanner] = useState(false);
  const [hasExternalScanner, setHasExternalScanner] = useState(false);
  const [lastScanTime, setLastScanTime] = useState('');

 useEffect(() => {
    const unsubscribeData = shopify.scanner.scannerData.current.subscribe((result) => {
      console.log('Full scan result:', result);
      console.log('Data:', result.data);
      
      // Use only result.data (not result.barcode)
      const scannedValue = result.data || '';
      
      setScanData(scannedValue);
      setScanSource(result.source || 'unknown');
      setLastScanTime(new Date().toLocaleTimeString());
    });

    const unsubscribeSources = shopify.scanner.sources.current.subscribe((sources) => {
      console.log('Available scanner sources:', sources);
      setHasCameraScanner(sources.includes('camera'));
      setHasExternalScanner(sources.includes('external'));
    });

    return () => {
      unsubscribeData();
      unsubscribeSources();
    };
  }, []);

  // Trigger camera scan
  const handleScan = async () => {
    try {
      const result = await shopify.scanner.scannerData.current.value;
      console.log('Scan completed:', result);
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  return (
    <s-modal heading="Scanner Example">
      <s-stack direction="block">
        <s-button onClick={handleScan}>Scan Barcode</s-button>
        
        <s-divider />
        
        <s-text>Scanned data: {scanData || 'No data yet'}</s-text>
        <s-text>Source: {scanSource || 'No source yet'}</s-text>
        <s-text>Last scan: {lastScanTime || 'Not scanned yet'}</s-text>
        
        <s-divider />
        
        {hasCameraScanner && (
          <s-text>✓ Camera scanner available</s-text>
        )}
        {hasExternalScanner && (
          <s-text>✓ External scanner available</s-text>
        )}
      </s-stack>
    </s-modal>
  );
};
