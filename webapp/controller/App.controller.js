sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";
  return Controller.extend("com.keytech.zkei.controller.Invoices", {
    onInit() {
      const location = window.location.hash;
      if (!location) {
        this.getView().byId("navigationList").setSelectedKey("homeButton");
      }
      if (location === "#/invoices/passive") {
        this.getView().byId("navigationList").setSelectedKey("passiveInvoicesBtn");
      }
      if (location === "#/invoices/active") {
        this.getView().byId("navigationList").setSelectedKey("activeInvoicesBtn");
      }
    },
    navTo(route) {
      this.getOwnerComponent().getRouter().navTo(route);
    },
  });
});
