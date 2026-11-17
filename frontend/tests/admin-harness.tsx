import React from "react";
import {createRoot} from "react-dom/client";
import {flushSync} from "react-dom";
import {MarketingLanguageProvider} from "../components/marketing-language";
import {AdminConsole, type ConsoleKind} from "../components/admin/admin-shell";
import type {Language} from "../lib/i18n";
const root=createRoot(document.getElementById("root")!);
(window as unknown as {renderAdmin: (kind:ConsoleKind,section:string,language:Language)=>void}).renderAdmin=(kind,section,language)=> {
  flushSync(()=>root.render(<MarketingLanguageProvider key={`${kind}-${section}-${language}`} initialLanguage={language}><AdminConsole kind={kind} section={section} /></MarketingLanguageProvider>));
};
