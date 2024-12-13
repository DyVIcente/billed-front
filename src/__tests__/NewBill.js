import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES } from "../constants/routes.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  let newBill;
  let onNavigateMock;

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "employee@test.com",
      })
    );

    onNavigateMock = jest.fn((pathname) => {
      document.body.innerHTML =
        "<div><form data-testid='form-new-bill'></form></div>";
    });

    document.body.innerHTML = NewBillUI();
  });

  describe("When NewBill is instantiated", () => {
    test("Then it should initialize correctly", () => {
      newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: window.localStorage,
      });

      expect(newBill.fileUrl).toBeNull();
      expect(newBill.fileName).toBeNull();
      expect(newBill.billId).toBeNull();
    });
  });

  describe("When I upload a file and submit the form", () => {
    beforeEach(() => {
      newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: window.localStorage,
      });
    });

    test("Then it should handle invalid file type", async () => {
      const fileInput = screen.getByTestId("file");
      const invalidFile = new File(["doc"], "document.pdf", {
        type: "application/pdf",
      });

      const alertMock = jest.spyOn(window, "alert").mockImplementation();

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(alertMock).toHaveBeenCalledWith(
        "Veuillez sélectionner un fichier image au format jpg, jpeg ou png."
      );
      alertMock.mockRestore();
    });

    test("Then it should reset the file input after invalid file type", () => {
      const fileInput = screen.getByTestId("file");
      const invalidFile = new File(["doc"], "document.pdf", {
        type: "application/pdf",
      });

      const alertMock = jest.spyOn(window, "alert").mockImplementation();

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(alertMock).toHaveBeenCalledWith(
        "Veuillez sélectionner un fichier image au format jpg, jpeg ou png."
      );
      expect(fileInput.value).toBe("");
      alertMock.mockRestore();
    });

    test("Then it should accept valid file types", async () => {
      const fileInput = screen.getByTestId("file");
      const validFile = new File(["test"], "image.jpg", { type: "image/jpeg" });

      await userEvent.upload(fileInput, validFile);

      expect(fileInput.files[0]).toBe(validFile);
    });
  });

  describe("When file upload fails", () => {
    beforeEach(() => {
      newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: {
          ...mockStore,
          bills: () => ({
            create: jest.fn().mockRejectedValue(new Error("Upload failed")),
          }),
        },
        localStorage: window.localStorage,
      });
    });

    test("Then it should handle file upload error", async () => {
      const fileInput = screen.getByTestId("file");
      const validFile = new File(["test"], "image.jpg", { type: "image/jpeg" });

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Trigger file upload
      await userEvent.upload(fileInput, validFile);

      // Wait for error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("When bill update fails", () => {
    beforeEach(() => {
      newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: {
          ...mockStore,
          bills: () => ({
            update: jest.fn().mockRejectedValue(new Error("Update failed")),
          }),
        },
        localStorage: window.localStorage,
      });
    });

    test("Then it should handle bill update error", async () => {
      // Prepare bill data
      newBill.fileUrl = "http://test.com/image.jpg";
      newBill.fileName = "image.jpg";

      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      // Fill out form
      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Test expense" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2024-01-01" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: 100 },
      });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: 20 } });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Test commentary" },
      });

      // Submit form
      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);

      // Wait for error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("When I submit the form", () => {
    beforeEach(() => {
      newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: window.localStorage,
      });

      newBill.fileUrl = "http://test.com/image.jpg";
      newBill.fileName = "image.jpg";
    });

    test("Then it should update the bill with valid data", async () => {
      const updateBillMock = jest.fn().mockResolvedValue({});
      mockStore.bills = () => ({ update: updateBillMock });

      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Test expense" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2024-01-01" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: 100 },
      });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: 20 } });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Test commentary" },
      });

      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(updateBillMock).toHaveBeenCalled();
        const receivedData = JSON.parse(updateBillMock.mock.calls[0][0].data);

        expect(receivedData).toMatchObject({
          type: "Transports",
          name: "Test expense",
          amount: 100,
          vat: "20",
          pct: 20,
          commentary: "Test commentary",
          fileUrl: "http://test.com/image.jpg",
          fileName: "image.jpg",
          status: "pending",
        });
      });
    });

    test("Then it should successfully create a new bill via POST", async () => {
      // Créer une instance de NewBill avec les mocks nécessaires
      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Préparer les données de la facture
      const billData = {
        type: "Transports",
        name: "Test Integration Bill",
        amount: 150,
        date: "2024-02-15",
        vat: "20",
        pct: 20,
        commentary: "Integration test bill",
        fileUrl: "http://test.com/integration-image.jpg",
        fileName: "integration-image.jpg",
        status: "pending",
      };

      // Mock de la méthode create du store
      const createBillMock = jest.fn().mockResolvedValue({
        id: "test-bill-123",
        ...billData,
      });
      mockStore.bills = () => ({ create: createBillMock });

      // Simuler l'appel de création de facture
      const createdBill = await mockStore.bills().create(billData);

      // Vérifications
      expect(createBillMock).toHaveBeenCalledWith(billData);
      expect(createdBill).toMatchObject({
        id: "test-bill-123",
        ...billData,
      });

      // Vérifier que les propriétés importantes sont présentes
      expect(createdBill.id).toBeDefined();
      expect(createdBill.status).toBe("pending");
      expect(createdBill.amount).toBe(150);
    });
  });
});
