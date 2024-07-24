sap.ui.define(["sap/ui/core/UIComponent", "com/keytech/zkei/model/models"], function (UIComponent, models) {
  "use strict";

  return UIComponent.extend("com.keytech.zkei.Component", {
    metadata: { manifest: "json" },
    serviceUrl: "https://corswebscrapper.awskeytech.com/http://gui.awskeytech.com:8000/sap/opu/odata/sap/ZKEI_FTR_SRV/",
    headers: null,
    init: function () {
      this.headers = new Headers();
      this.headers.append("Accept", "application/json");
      this.headers.append("Content-Type", "application/json");
      this.headers.append("Authorization", "Basic QUJMQVNJOktleXRlY2gyMDI0");

      UIComponent.prototype.init.apply(this, arguments);
      this.getRouter().initialize();
      this.setModel(models.createDeviceModel(), "device");

      const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" });
      this.setModel(new sap.ui.model.json.JSONModel({ today: oDateFormat.format(new Date()) }), "date");
    },
  });
});
