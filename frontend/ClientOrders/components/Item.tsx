import React from "react";
import { __actions } from "../../../store/actions/index.actions";
import useZustandStore from "../../../store/store";
import type { EatingTable, MenuItem, MenuItemMenuItemOption } from "shared/generated/prisma/client";
import toast from "react-hot-toast";
import ManageSupplementsModal from "./ManageSupplementsModal";
import ManageMenuItemOptionModal from "./ManageMenuItemOptionModal";
import ManageSupplementsForItemModal from "./ManageSupplementsForItemModal";
import Icon from "../../../components/Icon/Icon";

interface ItemProps {
  id: string;
  menuItem: MenuItem & { supplements?: any[]; menuItemMenuItemOption?: MenuItemMenuItemOption[] };
  eatingTable: EatingTable;
  order: any;
  deleteButton?: boolean;
  viewMyCommandModal?: boolean;
  resetTrigger?: boolean;
  shouldHide?: boolean;
  itemPrice?: number;
  count?: number;
  isStatic?: boolean; // New prop to control editability
}

export const Item = (props: ItemProps) => {
  const __action_addMenuItemToOrder = __actions.order.useAddMenuItemToOrder();
  const __action_removeMenuItemFromOrder = __actions.order.useDeleteMenuItemFromOrder();

  const [count, setCount] = React.useState(0);
  const [isSupplementModalOpen, setIsSupplementModalOpen] = React.useState(false);
  const [isSupplementModalOpen2, setIsSupplementModalOpen2] = React.useState(false);
  const [isLoadingSupplementsModal, setIsLoadingSupplementsModal] = React.useState(false);
  const zustandStore = useZustandStore();
  const [menuItemsOrder, setMenuItemsOrder] = React.useState<any>([]);
  const [isManageMenuItemOptionModalOpen, setIsManageMenuItemOptionModalOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<any>(null);

  React.useEffect(() => {}, [props.order, props.menuItem.id, zustandStore.isGettingCurrentOrder]);

  React.useEffect(() => {
    const data = props.order?.MenuItemOrderContainer?.filter(
      (item: any) => item.menuItemId === props.menuItem.id
    );

    setMenuItemsOrder(data);
  }, [props.order, props.order?.id, props.menuItem.id, zustandStore.isGettingCurrentOrder]);

  React.useEffect(() => {
    setCount(0);
  }, [props.order?.id]);

  React.useEffect(() => {
    if (menuItemsOrder?.length > 0 && !zustandStore.isGettingCurrentOrder) {
      const timeout = setTimeout(async () => {
        setCount(menuItemsOrder[0].count || 0);
      }, 1000); // debounce delay in ms

      return () => clearTimeout(timeout); // cleanup
    }
  }, [zustandStore.isGettingCurrentOrder, menuItemsOrder]);

  React.useEffect(() => {
    setIsLoadingSupplementsModal(zustandStore.isGettingCurrentOrder);
  }, [zustandStore.isGettingCurrentOrder]);

  async function addOnClick() {
    if (
      props.menuItem &&
      props.menuItem.menuItemMenuItemOption &&
      props.menuItem.menuItemMenuItemOption?.length > 0
    ) {
      setIsManageMenuItemOptionModalOpen(true);
    } else {
      setCount((prev) => prev + 1);
      const shallowCopy = structuredClone(props.menuItem) as any;
      delete shallowCopy.image;
      const __res = await __action_addMenuItemToOrder.trigger(props.order, shallowCopy, []);

      if (__res) {
        setSelectedItem(__res);
        if (props.menuItem.supplements && props.menuItem.supplements.length > 0) {
          setIsSupplementModalOpen(true);
        }
      }
    }
  }

  React.useEffect(() => {
    if (!menuItemsOrder || menuItemsOrder.length === 0) {
      return;
    }

    setSelectedItem((prev: any) => {
      const el = menuItemsOrder.find((item: any) => item.id === prev?.id);
      if (el) {
        return el;
      }
      return prev;
    });
  }, [menuItemsOrder]);

  async function confirmMenuItemOptions(menuItemOptions: any[]) {
    setCount((prev) => prev + 1);
    const shallowCopy = structuredClone(props.menuItem) as any;
    // shallowCopy.menuItemMenuItemOption = menuItemOptions;
    delete shallowCopy.image;
    const __res = await __action_addMenuItemToOrder.trigger(props.order, shallowCopy, menuItemOptions);
    if (__res) {
      setSelectedItem(__res);
      if (props.menuItem.supplements && props.menuItem.supplements.length > 0) {
        setIsSupplementModalOpen(true);
      }
    }
  }

  async function removeOnClick() {
    setCount((prev) => prev - 1);
    await __action_removeMenuItemFromOrder.trigger(props.order, props.menuItem);
  }

  const handleAddSupplements = async () => {
    if (!props.order) {
      toast.error("Veuillez d'abord sélectionner une table");
      return;
    }

    if (count === 0) {
      toast.error("Veuillez d'abord ajouter cet article à votre commande");
      return;
    }

    setIsLoadingSupplementsModal(true);

    try {
      // No need to pre-load anything, just open the modal
      setIsLoadingSupplementsModal(false);
      setIsSupplementModalOpen2(true);
    } catch (error) {
      setIsLoadingSupplementsModal(false);
      console.error("Error loading supplements:", error);
      toast.error("Erreur lors du chargement des suppléments");
    }
  };

  // Reset count when resetTrigger prop changes
  React.useEffect(() => {
    if (props.resetTrigger) {
      setCount(0);
    }
  }, [props.resetTrigger]);

  return props.shouldHide ? (
    <></>
  ) : (
    <div className="relative flex mx-4 mb-4 rounded-xl h-[175px] sm:h-[200px] shadow-md bg-white border border-gray-200 py-2 px-2">
      {props.menuItem.image ? (
        <img
          src={`${import.meta.env.VITE_API_URL}${props.menuItem.image}`}
          alt={props.menuItem.name}
          className="box-border rounded-xl  bg-[url('milkshake.jpg')] z-10 w-[120px] sm:w-[180px] object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div className="flex flex-col justify-between pr-2 flex-1">
        <div>
          <p className="font-semibold self-start text-left text-black px-2 sm:px-4 text-base lg:text-lg text-lg">
            {props.menuItem?.name}
          </p>
          <p className="font-semibold self-start text-left text-black px-2 sm:px-4 text-sm sm:text-base lg:text-base">
            {props.menuItem?.description || "Aucune description disponible."}
          </p>
        </div>

        <div className="flex justify-between items-center w-full">
          <p className="font-bold self-end px-2 sm:px-4 text-black text-base  lg:text-lg gap-x-1 flex">
            {/* {props.menuItem?.price} */} {props.itemPrice ? props.itemPrice : props.menuItem?.price}
            <span>DZD</span>
          </p>

          {props.isStatic && (
            <p className="font-bold self-center px-2 sm:px-4 text-black text-sm sm:text-base lg:text-lg">
              {props.count || count}
            </p>
          )}

          {!props.isStatic && (
            <div className="flex flex-col gap-2">
              {props.menuItem.isAvailable && (
                <button
                  onClick={handleAddSupplements}
                  disabled={count === 0 || isLoadingSupplementsModal}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors duration-200 font-medium ${
                    count > 0 && !isLoadingSupplementsModal
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isLoadingSupplementsModal ? (
                    <span className="flex items-center space-x-1">
                      <span className="animate-spin text-xs">⏳</span>
                      <span>Chargement...</span>
                    </span>
                  ) : (
                    "+ Suppléments"
                  )}
                </button>
              )}
              {props.menuItem.isAvailable ? (
                <div className="flex items-center">
                  {props.deleteButton && (
                    <div
                      className={`flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 border rounded-full  bg-[var(--addButtonBackground)] ml-1 sm:ml-2`}
                      onClick={removeOnClick}
                    >
                      <Icon iconname="minus" color="white" />
                    </div>
                  )}

                  <p className="font-bold self-center px-2 sm:px-4 text-black text-sm sm:text-base lg:text-lg">
                    {count}
                  </p>

                  <div
                    className={`flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 border rounded-full bg-[var(--addButtonBackground)]`}
                    onClick={addOnClick}
                  >
                    <Icon iconname="add" color="white" />
                  </div>
                </div>
              ) : (
                <p className="text-red-500 text-sm sm:text-base lg:text-lg font-medium">Epuisé</p>
              )}
            </div>
          )}

          {selectedItem && (
            <ManageSupplementsForItemModal
              isOpen={isSupplementModalOpen}
              setIsOpen={setIsSupplementModalOpen}
              menuItem={props.menuItem}
              menuItemOrder={selectedItem}
              order={props.order}
            />
          )}

          {/* Supplements Modal */}
          <ManageSupplementsModal
            isOpen={isSupplementModalOpen2}
            setIsOpen={setIsSupplementModalOpen2}
            menuItem={props.menuItem}
            menuItemsOrder={menuItemsOrder}
            order={props.order}
          />

          <ManageMenuItemOptionModal
            isOpen={isManageMenuItemOptionModalOpen}
            setIsOpen={setIsManageMenuItemOptionModalOpen}
            menuItem={props.menuItem}
            confirmMenuItemOptions={confirmMenuItemOptions}
          />
        </div>
      </div>
    </div>
  );
};
