sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "../utils/Toolbox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Token",
  ],
  function (Controller, UIComponent, Toolbox, JSONModel, Filter, FilterOperator, Token) {
    "use strict";

    return Controller.extend("com.keytech.zkei.controller.Search", {
      onInit: function () {
        this.getView().setBusy(true);
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("SearchRoute").attachMatched(this.fetchData, this);
      },
      fetchData: async function () {
        const headers = this.getOwnerComponent().headers;
        const options = { method: "GET", headers: headers };
        const url =
          this.getOwnerComponent().serviceUrl +
          "F4Set?$expand=ht001set,kredaset,f4_tipo_proc_fat,mekkaset,zf4_tpdocset";

        await fetch(url, options)
          .then(response => response.text())
          .then(result => {
            const ht001set = JSON.parse(result).d.results[0].ht001set.results;
            const kredaset = JSON.parse(result).d.results[0].kredaset.results;
            const mekkaset = JSON.parse(result).d.results[0].mekkaset.results;
            const zf4_tpdocset = JSON.parse(result).d.results[0].zf4_tpdocset.results;
            const f4_tipo_proc_fat = JSON.parse(result).d.results[0].f4_tipo_proc_fat.results;

            const oModel = new JSONModel();
            oModel.setData({ ht001set, kredaset, mekkaset, zf4_tpdocset, f4_tipo_proc_fat });
            this.getView().setModel(oModel, "matchcodes");
            this.getView().setBusy(false);
          })
          .catch(error => {
            Toolbox.alert({
              message: error.message,
              type: "error",
            });
            this.getView().setBusy(false);
          });
      },
      clearError: function (oEvent) {
        oEvent.getSource().setValueState("None");
      },
      valueChange: function (oEvent) {
        const sValue = oEvent.getSource().getValue();
        const oToken = new Token({ text: sValue });
        if (oEvent.getSource().getTokens().length > 0) oEvent.getSource().removeAllTokens();
        oEvent.getSource().addToken(oToken);
        oEvent.getSource().setValue(null);
      },
      selectSuggestion: function (oEvent) {
        const sId = oEvent.getSource().getId().split("--")[2];
        const sValue = oEvent.getParameter("selectedRow").getBindingContext("matchcodes").getObject()[sId];
        const oToken = new Token({ text: sValue });
        if (oEvent.getSource().getTokens().length > 0) oEvent.getSource().removeAllTokens();
        oEvent.getSource().addToken(oToken);
        oEvent.getSource().setValue(null);
      },
      openMatchcodes: function (oEvent) {
        this.sDialog = oEvent.getSource().getId();
        const sId = oEvent.getSource().getId().split("--")[2];
        if (!this.oDialog) this.oDialog = {};
        if (!this.oDialog[sId])
          this.oDialog[sId] = this.loadFragment({ name: "com.keytech.zkei.view.matchcodes." + sId });
        this.oDialog[sId].then(oDialog => oDialog.open());
      },
      closeMatchcodes: function (oEvent) {
        const oDialog = oEvent.getSource().getParent();
        this.byId(oDialog.getId().split("--")[2].replace("Matchcode", "Table")).getBinding("items").filter();
        this.byId(oDialog.getId().split("--")[2].replace("Matchcode", "DialogInput")).setValue(null);
        oDialog.close();
      },
      searchCustomer: function () {
        let aFilters = [];
        aFilters.push(new Filter("Bukrs", FilterOperator.Contains, this.getView().byId("bukrsDialogInput").getValue()));
        aFilters.push(new Filter("Butxt", FilterOperator.Contains, this.getView().byId("bukrsDialogInput").getValue()));
        const oFilter = new Filter({ filters: aFilters, and: false });
        this.byId("bukrsTable").getBinding("items").filter(oFilter);
      },
      selectCustomer: function (oEvent) {
        const sBukrs = oEvent.getParameter("listItem").getBindingContext("matchcodes").getObject().Bukrs;
        const oToken = new Token({ text: sBukrs });
        const oInput = this.getView().byId("Bukrs");
        if (oInput.getTokens().length > 0) oInput.removeAllTokens();
        oInput.addToken(oToken);
        oInput.setValue(null);
        this.closeMatchcodes(oEvent);
      },
      searchLifnr: function () {
        let aFilters = [];
        aFilters.push(new Filter("Lifnr", FilterOperator.Contains, this.getView().byId("lifnrDialogInput").getValue()));
        aFilters.push(new Filter("Mcod1", FilterOperator.Contains, this.getView().byId("lifnrDialogInput").getValue()));
        aFilters.push(new Filter("Sortl", FilterOperator.Contains, this.getView().byId("lifnrDialogInput").getValue()));
        const oFilter = new Filter({ filters: aFilters, and: false });
        this.byId("lifnrTable").getBinding("items").filter(oFilter);
      },
      selectLifnr: function (oEvent) {
        const sLifnr = oEvent.getParameter("listItem").getBindingContext("matchcodes").getObject().Lifnr;
        const oToken = new Token({ text: sLifnr });
        const oInput = this.getView().byId("Lifnr" + "--" + this.sDialog.split("--")[3]);
        if (oInput.getTokens().length > 0) oInput.removeAllTokens();
        oInput.addToken(oToken);
        oInput.setValue(null);
        this.closeMatchcodes(oEvent);
      },
      goAhead: function () {
        const Bukrs = this.getView().byId("Bukrs").getTokens()?.[0]?.getText() ?? null; // Customer
        const Gjahr = this.getView().byId("Gjahr").getValue(); // Year
        const LifnrFrom = this.getView().byId("Lifnr--from").getTokens()?.[0]?.getText() ?? null;
        const LifnrTo = this.getView().byId("Lifnr--to").getTokens()?.[0]?.getText() ?? null;
        const Lifnr =
          LifnrFrom && LifnrTo
            ? `${LifnrFrom}>${LifnrTo}`
            : LifnrFrom
            ? LifnrFrom
            : LifnrTo
            ? `'1'>${LifnrTo}`
            : "none"; // Supplier
        const BldatFrom = this.getView().byId("Bldat--from").getValue()
          ? new Date(this.getView().byId("Bldat--from").getValue()).toLocaleDateString().replaceAll("/", ".")
          : null;
        const BldatTo = this.getView().byId("Bldat--to").getValue()
          ? new Date(this.getView().byId("Bldat--to").getValue()).toLocaleDateString().replaceAll("/", ".")
          : null;
        const Bldat =
          BldatFrom && BldatTo
            ? `${BldatFrom}>${BldatTo}`
            : BldatFrom
            ? BldatFrom
            : BldatTo
            ? `01.01.1970>${BldatTo}`
            : "none"; // Date
        const Stato_fatt = this.getView().byId("statusSearchInput").getSelectedIndex(); // Status

        if (!Bukrs || !Gjahr || !Stato_fatt) {
          Toolbox.alert({
            message: this.getView().getModel("i18n").getResourceBundle().getText("inputError"),
            type: "error",
          });
          if (!Bukrs) this.getView().byId("Bukrs").setValueState("Error");
          if (!Gjahr) this.getView().byId("Gjahr").setValueState("Error");
          return;
        } else {
          const oRouter = UIComponent.getRouterFor(this);
          oRouter.navTo("InvoicesRoute", { Bukrs, Gjahr, Stato_fatt, Lifnr, Bldat });
        }
      },
    });
  }
);
