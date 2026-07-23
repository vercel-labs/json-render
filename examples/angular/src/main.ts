import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent, appProviders } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [appProviders],
}).catch((err) => console.error(err));
