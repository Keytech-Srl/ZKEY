sap.ui.define(["sap/m/MessageBox"], function (MessageBox) {
  "use strict";

  return {
    alert: function (oEvent) {
      switch (oEvent.type) {
        case "success":
          MessageBox.success(oEvent.message);
          break;
        case "error":
          MessageBox.error(oEvent.message);
          break;
        case "warning":
          MessageBox.warning(oEvent.message);
          break;
        case "info":
          MessageBox.information(oEvent.message);
          break;
        default:
          break;
      }
    },
  };
});
