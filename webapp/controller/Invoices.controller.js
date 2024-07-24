sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "../utils/Toolbox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Token",
    "sap/ui/core/Fragment",
    "sap/ui/core/library",
  ],
  function (Controller, UIComponent, Toolbox, JSONModel, Filter, FilterOperator, Token, Fragment) {
    "use strict";
    return Controller.extend("com.keytech.zkei.controller.Invoices", {
      onInit: function () {
        console.log("Ciao");
        this.getView().setBusy(true);
        const oModel = new JSONModel({ invoice: null });
        this.getView().setModel(oModel, "preview");
        const oRouter = UIComponent.getRouterFor(this);
        oRouter.getRoute("InvoicesRoute").attachMatched(this.fetchInvoices, this);
        this.isSelectedColumns = false;
        this.selectedColumnIndex = null;
        this.sumRowIndex = null;
      },
      fetchInvoices: async function (oEvent, isRefresh) {

        let oArgs;
        if (!isRefresh) {
          oArgs = oEvent.getParameters().arguments;
          this.oArgs = oArgs;
        } else {
          oArgs = this.oArgs;
        }

        const headers = this.getOwnerComponent().headers;
        const params = { Bukrs: oArgs.Bukrs, Gjahr: oArgs.Gjahr, Stato_fatt: oArgs.Stato_fatt, Results: [] };
        const options = { method: "POST", headers: headers, body: JSON.stringify(params) };
        const url = this.getOwnerComponent().serviceUrl + "ZKEI_INSet";

        await fetch(url, options)
          .then(response => response.text())
          .then(async result => {
            const results = JSON.parse(result).d.Results.results;
            const oModel = new JSONModel();
            oModel.setData(results);

            let aFilters = [];
            if (oArgs.Lifnr !== "none") {
              const aLifnr = oArgs.Lifnr.split(">");
              if (aLifnr.length === 1) {
                aFilters.push(new Filter("Lifnr", FilterOperator.EQ, parseInt(aLifnr[0])));
              } else {
                aFilters.push(new Filter("Lifnr", FilterOperator.BT, parseInt(aLifnr[0]), parseInt(aLifnr[1])));
              }
            }
            if (oArgs.Bldat !== "none") {
              const aBldat = oArgs.Bldat.split(">");
              if (aBldat.length === 1) {
                let parts = aBldat[0].split(".");
                let date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                date.setHours(date.getHours() + 1);
                aFilters.push(new Filter("Bldat", FilterOperator.EQ, date.toISOString().slice(0, 10)));
              } else {
                let parts1 = aBldat[0].split(".");
                let date1 = new Date(`${parts1[2]}-${parts1[1]}-${parts1[0]}`);
                date1.setHours(date1.getHours() + 1);
                let parts2 = aBldat[1].split(".");
                let date2 = new Date(`${parts2[2]}-${parts2[1]}-${parts2[0]}`);
                date2.setHours(date2.getHours() + 1);
                aFilters.push(
                  new Filter(
                    "Bldat",
                    FilterOperator.BT,
                    date1.toISOString().slice(0, 10),
                    date2.toISOString().slice(0, 10)
                  )
                );
              }
            }

            this.getView().setModel(oModel, "table");
            this.getView().byId("table").getBinding("rows").filter(aFilters);
            this.getView().byId("table").setBusy(false);
            await this.fetchMatchcodes();
          })
          .catch(error => {
            Toolbox.alert({
              message: error.message,
              type: "error",
            });
            this.getView().byId("table").setBusy(false);
          });
      },
      fetchMatchcodes: async function () {
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
      refreshTable: function () {
        this.getView().setBusy(true);
        this.fetchInvoices(null, true);
      },
      selectRowIndex: function (oEvent) {
        const rowIndex = oEvent.getParameters().rowIndex;
        if (rowIndex === this.selectedRowIndex) {
          this.selectedRowIndex = null;
        } else {
          this.selectedRowIndex = rowIndex;
        }
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
        let sId = oEvent.getSource().getId().split("--")[2];
        if (sId === "VendPR") sId = "DOMVALUE_L";
        if (sId === "Ebeln") sId = "Blart";
        const sValue = oEvent.getParameter("selectedRow").getBindingContext("matchcodes").getObject()[sId];
        const oToken = new Token({ text: sValue });
        if (oEvent.getSource().getTokens().length > 0) oEvent.getSource().removeAllTokens();
        oEvent.getSource().addToken(oToken);
        oEvent.getSource().setValue(null);
      },
      openDialog: function (oEvent) {
        this.sDialog = oEvent.getSource().getId();
        const selectedIndex = this.selectedRowIndex;
        if (selectedIndex !== null && selectedIndex !== undefined) {
          const sId = oEvent.getSource().getId().split("--")[2];
          if (!this.oDialog) this.oDialog = {};
          if (!this.oDialog[sId]) {
            this.oDialog[sId] = this.loadFragment({ name: "com.keytech.zkei.view.dialogs." + sId });
          }
          const selectedRowData = this.getView().getModel("table").getData()[selectedIndex];
          if (sId === "Document" && !selectedRowData.Lifnr) {
            Toolbox.alert({
              message: `Aggiornare fornitore! Impossibile elaborare doc.\n\n ${selectedRowData.Xblnr}`,
              type: "error",
            });
          } else {
            const oModel = new JSONModel(selectedRowData);
            this.getView().setModel(oModel, "selectedRowData");
            this.oDialog[sId].then(oDialog => oDialog.open());
          }
        } else {
          Toolbox.alert({
            message: "Selezionare una riga",
            type: "error",
          });
        }
      },
      closeDialog: function (oEvent) {
        const oDialog = oEvent.getSource().getParent();
        const sId = oEvent.getSource().getId().split("--")[2];
        if (sId === "Lifnr") this.getView().byId(sId).removeAllTokens();
        if (sId === "Document") {
          const oDatePicker = this.getView().byId("Budat");
          const sToday = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "dd/MM/yyyy" }).format(new Date());
          oDatePicker.setValue(sToday);
          oDatePicker.setValueState("None");
          const oVendPR = this.getView().byId("VendPR");
          oVendPR.removeAllTokens();
          const oEbeln = this.getView().byId("Ebeln");
          oEbeln.removeAllTokens();
          oEbeln.setValueState("None");
          const oBlart = this.getView().byId("Blart");
          oBlart.setValue("");
        }
        oDialog.close();
      },
      openMatchcodes: function (oEvent) {
        const sId = oEvent.getSource().getId().split("--")[2];
        if (!this.oMatchcode) this.oMatchcode = {};
        if (!this.oMatchcode[sId])
          this.oMatchcode[sId] = this.loadFragment({ name: "com.keytech.zkei.view.matchcodes." + sId });
        this.oMatchcode[sId].then(oMatchcode => oMatchcode.open());
      },
      closeMatchcodes: function (oEvent) {
        const oDialog = oEvent.getSource().getParent();
        this.byId(oDialog.getId().split("--")[2].replace("Matchcode", "Table")).getBinding("items").filter();
        this.byId(oDialog.getId().split("--")[2].replace("Matchcode", "DialogInput")).setValue(null);
        oDialog.close();
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
        const oInput = this.getView().byId("Lifnr");
        if (oInput.getTokens().length > 0) oInput.removeAllTokens();
        oInput.addToken(oToken);
        oInput.setValue(null);
        this.closeMatchcodes(oEvent);
      },
      changeLifnr: async function (oEvent) {
        this.getView().setBusy(true);
        const oRow = this.getView().getModel("selectedRowData").getData();
        delete oRow.__metadata;
        const sLifnrNew = this.getView().byId("Lifnr").getTokens()[0].getText();

        const headers = this.getOwnerComponent().headers;
        const params = { Bukrs: oRow.Bukrs, Code: "", Message: "", Lifnr_new: sLifnrNew, Row: oRow };
        const options = { method: "POST", headers: headers, body: JSON.stringify(params) };
        const url = this.getOwnerComponent().serviceUrl + "Update_FornitoreSet";

        await fetch(url, options)
          .then(response => response.text())
          .then(result => {
            const response = JSON.parse(result).d;
            if (response) {
              if (response.Code === "E" || response.Code === "KO") {
                Toolbox.alert({ message: response.Message, type: "error" });
              } else {
                Toolbox.alert({ message: response.Message, type: "success" });
                this.getView().getModel("table").getData()[this.selectedRowIndex].Lifnr = sLifnrNew;
                this.getView().getModel("table").refresh();
              }
              this.getView().setBusy(false);
              this.closeDialog(oEvent);
            } else
              throw new Error(
                this.getView().getModel("i18n").getResourceBundle().getText("payloadError") +
                  ": " +
                  JSON.parse(result).error.message.value
              );
          })
          .catch(error => {
            Toolbox.alert({ message: error.message, type: "error" });
            this.getView().setBusy(false);
            this.closeDialog(oEvent);
          });
      },
      changeXblnr: async function (oEvent) {
        this.getView().setBusy(true);
        const oRow = this.getView().getModel("selectedRowData").getData();
        delete oRow.__metadata;
        const sXblnrNew = this.getView().byId("Xblnr").getValue();

        const headers = this.getOwnerComponent().headers;
        const params = { Bukrs: oRow.Bukrs, Code: "", Message: "", Xblnr_new: sXblnrNew, Row: oRow };
        const options = { method: "POST", headers: headers, body: JSON.stringify(params) };
        const url = this.getOwnerComponent().serviceUrl + "Update_XblnrSet";

        await fetch(url, options)
          .then(response => response.text())
          .then(result => {
            const response = JSON.parse(result).d;
            if (response) {
              if (response.Code === "E" || response.Code === "KO") {
                Toolbox.alert({ message: response.Message, type: "error" });
              } else {
                Toolbox.alert({ message: response.Message, type: "success" });
                this.getView().getModel("table").getData()[this.selectedRowIndex].Xblnr = sXblnrNew;
                this.getView().getModel("table").refresh();
              }
              this.getView().setBusy(false);
              this.closeDialog(oEvent);
            } else
              throw new Error(
                this.getView().getModel("i18n").getResourceBundle().getText("payloadError") +
                  ": " +
                  JSON.parse(result).error.message.value
              );
          })
          .catch(error => {
            Toolbox.alert({ message: error.message, type: "error" });
            this.getView().setBusy(false);
            this.closeDialog(oEvent);
          });
      },
      searchVendPR: function () {
        let aFilters = [];
        aFilters.push(
          new Filter("DOMVALUE_L", FilterOperator.Contains, this.getView().byId("vendPRDialogInput").getValue())
        );
        aFilters.push(
          new Filter("DDTEXT", FilterOperator.Contains, this.getView().byId("vendPRDialogInput").getValue())
        );
        const oFilter = new Filter({ filters: aFilters, and: false });
        this.byId("vendPRTable").getBinding("items").filter(oFilter);
      },
      selectVendPR: function (oEvent) {
        const sVendPR = oEvent.getParameter("listItem").getBindingContext("matchcodes").getObject().DOMVALUE_L;
        const oToken = new Token({ text: sVendPR });
        const oInput = this.getView().byId("VendPR");
        if (oInput.getTokens().length > 0) oInput.removeAllTokens();
        oInput.addToken(oToken);
        oInput.setValue(null);
        this.closeMatchcodes(oEvent);
      },
      searchEbeln: function () {
        let aFilters = [];
        aFilters.push(new Filter("Blart", FilterOperator.Contains, this.getView().byId("ebelnDialogInput").getValue()));
        aFilters.push(new Filter("Ltext", FilterOperator.Contains, this.getView().byId("ebelnDialogInput").getValue()));
        const oFilter = new Filter({ filters: aFilters, and: false });
        this.byId("ebelnTable").getBinding("items").filter(oFilter);
      },
      selectEbeln: function (oEvent) {
        const sEbeln = oEvent.getParameter("listItem").getBindingContext("matchcodes").getObject().Blart;
        const oToken = new Token({ text: sEbeln });
        const oInput = this.getView().byId("Ebeln");
        if (oInput.getTokens().length > 0) oInput.removeAllTokens();
        oInput.addToken(oToken);
        oInput.setValue(null);
        oInput.setValueState("None");
        this.closeMatchcodes(oEvent);
      },
      changeDocument: async function (oEvent) {
        this.getView().setBusy(true);
        const oRow = this.getView().getModel("selectedRowData").getData();
        delete oRow.__metadata;
        const oDate = this.getView().byId("Budat").getDateValue();
        const sBudatNew = oDate
          ? `${oDate.getFullYear()}/${(oDate.getMonth() + 1).toString().padStart(2, "0")}/${oDate
              .getDate()
              .toString()
              .padStart(2, "0")}`
          : "";
        const sVendPRNew = this.getView().byId("VendPR").getTokens()?.[0]?.getText() ?? "";
        const sEbelnNew = this.getView().byId("Ebeln").getTokens()?.[0]?.getText() ?? "";
        const sBlartNew = this.getView().byId("Blart").getValue() || "";
        if (!sBudatNew || !sEbelnNew) {
          Toolbox.alert({
            message: this.getView().getModel("i18n").getResourceBundle().getText("inputError"),
            type: "error",
          });
          if (!sBudatNew) this.getView().byId("Budat").setValueState("Error");
          if (!sEbelnNew) this.getView().byId("Ebeln").setValueState("Error");
          this.getView().setBusy(false);
          return;
        } else {
          const headers = this.getOwnerComponent().headers;
          const params = {
            Bukrs: oRow.Bukrs,
            Code: "",
            Message: "",
            Ebeln: sEbelnNew,
            Blart: sBlartNew,
            VendPR: sVendPRNew,
            Budat: sBudatNew,
            Row: oRow,
          };
          const options = { method: "POST", headers: headers, body: JSON.stringify(params) };
          const url = this.getOwnerComponent().serviceUrl + "Doc_ProcessSet";

          await fetch(url, options)
            .then(response => response.text())
            .then(result => {
              const response = JSON.parse(result).d;
              if (response) {
                if (response.Code === "E" || response.Code === "KO") {
                  Toolbox.alert({ message: response.Message, type: "error" });
                } else {
                  Toolbox.alert({ message: response.Message, type: "success" });
                  this.getView().getModel("table").refresh();
                }
                this.getView().setBusy(false);
                this.closeDialog(oEvent);
              } else
                throw new Error(
                  this.getView().getModel("i18n").getResourceBundle().getText("payloadError") +
                    ": " +
                    JSON.parse(result).error.message.value
                );
            })
            .catch(error => {
              Toolbox.alert({ message: error.message, type: "error" });
              this.getView().setBusy(false);
              this.closeDialog(oEvent);
            });
        }
      },
      openInvoiceLink: function (oEvent, rowData) {
        const sButtonId = oEvent.getSource().getId().split("--")[2];
        let ftValue;

        if (rowData) {
          ftValue = rowData[sButtonId];
        } else {
          const rowDataFromModel = this.getView().getModel("selectedRowData").getData();
          ftValue = rowDataFromModel[sButtonId];
        }
        this.getView().getModel("preview").setProperty("/invoice", ftValue);
        if (sButtonId === "Fattae" || sButtonId === "Fattbr") {
          if (!this.oInvoiceDialog) {
            this.oInvoiceDialog = Fragment.load({
              name: "com.keytech.zkei.view.dialogs.InvoicePage",
              controller: this,
            }).then(
              function (oDialog) {
                this.getView().addDependent(oDialog);
                oDialog.open();
              }.bind(this)
            );
          } else {
            const oDialog = this.getView().getDependents()[0];
            oDialog.open();
          }
        } else {
          const newWindow = window.open("", "_blank");
          newWindow.document.open();
          newWindow.document.write(ftValue);
          newWindow.document.close();
        }
      },
      onInvoiceButtonPress: function (oEvent) {
        const oButton = oEvent.getSource();
        const oBindingContext = oButton.getBindingContext("table");
        const rowData = oBindingContext.getObject();

        this.openInvoiceLink(oEvent, rowData);
      },
      openNotification: function () {
        const selectedRowData = this.getView().getModel("selectedRowData").getData();
        Toolbox.alert({ message: selectedRowData.Notif, type: "info" });
      },
      openLog: function () {
        Toolbox.alert({ message: "Log", type: "info" });
      },
      selectColumn: function (oEvent) {
        const oColumn = oEvent.getSource().getParent();
        const oTable = oColumn.getParent();
        const aColumns = oTable.getColumns();
        const iColumnIndex = aColumns.indexOf(oColumn);

        this.isSelectedColumns = !this.isSelectedColumns;

        if (this.isSelectedColumns) {
          this.selectedColumnIndex = iColumnIndex;
          oTable.getRows().forEach(row => {
            const cell = row.getCells()[iColumnIndex];
            cell.addStyleClass("selectedColumn");
          });
        } else {
          this.deselectColumn();
        }
      },
      deselectColumn: function () {
        const oTable = this.getView().byId("table");
        if (this.selectedColumnIndex !== null) {
          oTable.getRows().forEach(row => {
            const cell = row.getCells()[this.selectedColumnIndex];
            cell.removeStyleClass("selectedColumn");
          });
          this.selectedColumnIndex = null;
        }
      },
      calculateColumnSum: function () {
        if (!this.selectedColumnIndex) {
          Toolbox.alert({
            message: this.getView().getModel("i18n").getResourceBundle().getText("selectedColumnError"),
            type: "error",
          });
          return;
        }

        const oTable = this.getView().byId("table");
        const oModel = oTable.getModel("table");
        const aData = oModel.getProperty("/");

        if (this.sumRowIndex !== null) {
          const oSumRowControl = oTable.getRows()[this.sumRowIndex];
          if (oSumRowControl) {
            oSumRowControl.removeStyleClass("sumBackground");
            this.deselectColumn();
          }
          aData.splice(this.sumRowIndex, 1);
          this.sumRowIndex = null;
          oModel.setProperty("/", aData);
          oTable.getBinding("rows").refresh();
          return;
        }

        let sum = 0;
        oTable.getRows().forEach(row => {
          const cell = row.getCells()[this.selectedColumnIndex];
          const value = parseFloat(cell.getItems()[0].getProperty("text"));
          if (!isNaN(value)) {
            sum += value;
          }
        });

        const oNewRow = {
          Waers: "EUR",
          Wrbtr: sum.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        };

        aData.push(oNewRow);
        oModel.setProperty("/", aData);
        oTable.getBinding("rows").refresh();

        this.sumRowIndex = aData.length - 1;

        const oNewRowControl = oTable.getRows()[this.sumRowIndex];
        if (oNewRowControl) {
          oNewRowControl.addStyleClass("sumBackground");
          this.deselectColumn();
          this.isSelectedColumns = false;
        }
      },
      sortAscending: function () {
        if (this.isSelectedColumns) {
          const oTable = this.getView().byId("table");
          const oBinding = oTable.getBinding("rows");
          const aSorters = [];
          const oSelectedColumn = oTable.getColumns()[this.selectedColumnIndex];
          const sPath = oSelectedColumn.getId().split("--")[2];
          aSorters.push(new sap.ui.model.Sorter(sPath, false));
          oBinding.sort(aSorters);
        } else {
          Toolbox.alert({ message: "Selezionare una Colonna", type: "error" });
        }
      },
      sortDescending: function () {
        if (this.isSelectedColumns) {
          const oTable = this.getView().byId("table");
          const oBinding = oTable.getBinding("rows");
          const aSorters = [];
          const oSelectedColumn = oTable.getColumns()[this.selectedColumnIndex];
          const sPath = oSelectedColumn.getId().split("--")[2];
          aSorters.push(new sap.ui.model.Sorter(sPath, true));
          oBinding.sort(aSorters);
        } else Toolbox.alert({ message: "Selezionare una Colonna", type: "error" });
      },
      onSearch: function (oEvent) {
        const sQuery = oEvent.getParameter("newValue");
        const oTable = this.byId("table");
        const oBinding = oTable.getBinding("rows");

        if (sQuery) {
          const aFilters = [
            new Filter("StDescr", FilterOperator.Contains, sQuery),
            new Filter("Bukrs", FilterOperator.Contains, sQuery),
            new Filter("Gjahr", FilterOperator.Contains, sQuery),
            new Filter("Numdoc", FilterOperator.Contains, sQuery),
            new Filter("Tpdoc", FilterOperator.Contains, sQuery),
            new Filter("Bldat", FilterOperator.Contains, sQuery),
            new Filter("Lifnr", FilterOperator.Contains, sQuery),
            new Filter("Waers", FilterOperator.Contains, sQuery),
            new Filter("Wrbtr", FilterOperator.Contains, sQuery),
            new Filter("Xblnr", FilterOperator.Contains, sQuery),
            new Filter("Cpudt", FilterOperator.Contains, sQuery),
            new Filter("Cputm", FilterOperator.Contains, sQuery),
            new Filter("Usnam", FilterOperator.Contains, sQuery),
            new Filter("Hrric", FilterOperator.Contains, sQuery),
            new Filter("Filename", FilterOperator.Contains, sQuery),
          ];

          const oFilter = new Filter({
            filters: aFilters,
            and: false,
          });

          oBinding.filter([oFilter]);
        } else {
          oBinding.filter([]);
        }
      },
    });
  }
);
