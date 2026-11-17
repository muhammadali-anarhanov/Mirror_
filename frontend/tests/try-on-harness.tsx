import React from 'react';
import { createRoot } from 'react-dom/client';
import RealtimeTryOn from '../components/realtime-try-on';
import MirrorRoom from '../components/mirror-room';
import { MarketingLanguageProvider } from '../components/marketing-language';
const productId = new URLSearchParams(location.search).get('productId') || '';
createRoot(document.getElementById('root')!).render(<MarketingLanguageProvider initialLanguage="EN">{location.pathname === '/mirror/try-on' ? <RealtimeTryOn productId={productId} /> : <MirrorRoom />}</MarketingLanguageProvider>);
