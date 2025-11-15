import React from "react";
import type { ModalProps } from "../../../_enums";
import Modal from "../../../components/Modal";
import { __actions } from "../../../store/actions/index.actions";
import toast from "react-hot-toast";

interface SelectTableModalProps extends ModalProps {
  menuItem: any;
  menuItemOrder: any;
  order: any;
}

// Child component for rendering each supplement
const SupplementRow = React.memo(
  ({
    isAdded,
    isLoading,
    supplement,
    onAdd,
    onRemove,
  }: {
    isAdded: boolean;
    isLoading: boolean;
    supplement: any;
    onAdd: () => void;
    onRemove: () => void;
  }) => {
    return (
      <div
        className={`flex items-center justify-between p-3 border rounded-lg transition-colors duration-200 ${
          isAdded ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <div>
          <h4 className="font-medium text-gray-900">{supplement.name}</h4>
          <p className="text-sm text-orange-600 font-semibold">+{supplement.price} DZD</p>
        </div>

        <button
          onClick={isAdded ? onRemove : onAdd}
          disabled={isLoading}
          className={`px-3 py-1 text-xs rounded-lg transition-colors duration-200 ${
            isLoading
              ? "bg-gray-400 text-white cursor-not-allowed"
              : isAdded
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
        >
          {isLoading ? <span className="animate-spin">⏳</span> : isAdded ? "Retirer" : "Ajouter"}
        </button>
      </div>
    );
  }
);

const ManageSupplementsForItemModal = (props: SelectTableModalProps) => {
  const addSupplement = __actions.supplements.useAddSupplementToMenuItemOrder();
  const removeSupplement = __actions.supplements.useRemoveSupplementFromMenuItemOrder();
  const [loadingSupplements, setLoadingSupplements] = React.useState<string[]>([]);

  const isLoading = (key: string) => loadingSupplements.includes(key);

  const updateLoadingState = (key: string, add: boolean) => {
    setLoadingSupplements((prev) => (add ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const handleAdd = async (menuItemOrderId: string, supplementId: string) => {
    const key = `${menuItemOrderId}-${supplementId}`;
    updateLoadingState(key, true);

    const orderItem = props.order.MenuItemOrderContainer.find((item: any) => item.id === menuItemOrderId);
    if (orderItem) {
      orderItem.selectedSupplements ||= [];
      const supplement = props.menuItem.supplements?.find(
        (s: any) => s.supplement.id === supplementId
      )?.supplement;
      orderItem.selectedSupplements.push({ id: `temp-${supplementId}`, supplementId, supplement });
    }

    try {
      await addSupplement.trigger(menuItemOrderId, supplementId);
      toast.success("Supplément ajouté avec succès");
    } catch (err) {
      if (orderItem) {
        orderItem.selectedSupplements = orderItem.selectedSupplements?.filter(
          (s: any) => s.supplementId !== supplementId
        );
      }
      console.error(err);
      toast.error("Erreur lors de l'ajout du supplément");
    } finally {
      updateLoadingState(key, false);
    }
  };

  const handleRemove = async (menuItemOrderId: string, supplementId: string) => {
    const key = `${menuItemOrderId}-${supplementId}`;
    updateLoadingState(key, true);

    const orderItem = props.order.MenuItemOrderContainer.find((item: any) => item.id === menuItemOrderId);
    const removed = orderItem?.selectedSupplements?.find((s: any) => s.supplementId === supplementId);

    if (orderItem) {
      orderItem.selectedSupplements = orderItem.selectedSupplements?.filter(
        (s: any) => s.supplementId !== supplementId
      );
    }

    try {
      await removeSupplement.trigger(menuItemOrderId, supplementId);
      toast.success("Supplément retiré avec succès");
    } catch (err) {
      if (removed && orderItem) {
        orderItem.selectedSupplements ||= [];
        orderItem.selectedSupplements.push(removed);
      }
      console.error(err);
      toast.error("Erreur lors du retrait du supplément");
    } finally {
      updateLoadingState(key, false);
    }
  };

  return (
    <Modal isOpen={props.isOpen} setIsOpen={props.setIsOpen}>
      <div className="p-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Gérer les Suppléments - {props.menuItem.name}</h2>
          <button
            onClick={() => props.setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{props.menuItem.name}</h3>
              <span className="text-sm text-gray-600">
                {props.menuItemOrder.selectedSupplements?.length || 0} supplément(s)
              </span>
            </div>

            {props.menuItem.supplements?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {props.menuItem.supplements.map((supp: any) => {
                  const id = supp.supplement.id;
                  const key = `${props.menuItemOrder.id}-${id}`;
                  const isAdded = props.menuItemOrder.selectedSupplements?.some(
                    (s: any) => s.supplementId === id
                  );
                  const isBtnLoading = isLoading(key);

                  return (
                    <SupplementRow
                      key={id}
                      isAdded={isAdded}
                      isLoading={isBtnLoading}
                      supplement={supp.supplement}
                      onAdd={() => handleAdd(props.menuItemOrder.id, id)}
                      onRemove={() => handleRemove(props.menuItemOrder.id, id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Aucun supplément disponible pour cet article</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => props.setIsOpen(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            Confirmer
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ManageSupplementsForItemModal;
