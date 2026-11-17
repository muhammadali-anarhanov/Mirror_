import test from 'node:test';
import assert from 'node:assert/strict';
import {LANGUAGE_CODES,isLanguage,translateText} from '../lib/i18n.ts';
import {UI_MESSAGES} from '../lib/translations/ui.ts';
import {localizedProductName} from '../lib/catalog-locale.ts';
test('supported locale values are validated and invalid cookie values rejected',()=>{
 assert.deepEqual(LANGUAGE_CODES,['EN','UZ','RU','KK','AR','TR']);
 for(const code of LANGUAGE_CODES)assert.ok(isLanguage(code));
 for(const invalid of ['uz','undefined','<script>','',null])assert.equal(isLanguage(invalid),false);
});
test('messages fall back to English and the central dictionary covers all six languages',()=>{
 assert.equal(translateText('UZ','Choose language'),'Tilni tanlang');
 assert.equal(translateText('AR','Welcome back'),'مرحبًا بعودتك');
 assert.equal(translateText('RU','Untranslated English fallback'),'Untranslated English fallback');
 for(const [key,entry] of Object.entries(UI_MESSAGES))for(const language of LANGUAGE_CODES)assert.ok(entry[language],`${key}: missing ${language}`);
});
test('merchant names are never treated as UI translations and explicit translations win',()=>{
 const product={id:'merchant-product',name:'Products'};
 assert.equal(localizedProductName(product,'UZ'),'Products');
 assert.equal(localizedProductName({...product,nameTranslations:{UZ:'Savdogar nomi'}},'UZ'),'Savdogar nomi');
 assert.equal(localizedProductName({...product,nameTranslations:{UZ:'Savdogar nomi'}},'EN'),'Products');
});
test('interpolated system notifications preserve branch and product content',()=>{
 assert.equal(translateText('UZ','Search {title}',{title:'Mahsulotlar'}),'Mahsulotlar bo‘yicha qidirish');
 assert.ok(translateText('RU','12 units received into Merchant Branch. Demo stock updated in this session only.').includes('Merchant Branch'));
 assert.ok(translateText('AR','Simulated scan matched Merchant Product.').includes('Merchant Product'));
});
