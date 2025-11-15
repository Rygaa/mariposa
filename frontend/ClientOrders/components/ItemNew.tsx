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
        setIsSupplementModalOpen(true);
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
      setIsSupplementModalOpen(true);
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
    <div className="relative flex flex-col w-full rounded-[5px] h-[350px] shadow-lg bg-white border border-gray-200 ">
      {props.menuItem.image ? (
        <img
          src={`${import.meta.env.VITE_API_URL}${props.menuItem.image}`}
          alt={props.menuItem.name}
          className="right-0 box-border rounded-[5px] object-cover z-10 w-full h-[50%] p-1 "
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <div className="flex flex-col justify-between pr-2 sm:mt-3 w-full py-2 flex-1">
        <div>
          <p className="font-semibold self-start text-left text-black pt-1 px-4 text-base text-lg">
            {props.menuItem?.name}
          </p>
          {/* <p className="font-semibold self-start text-left text-black px-2 sm:px-4 text-sm sm:text-base lg:text-base">
            {props.menuItem?.description || "Aucune description disponible."}
          </p> */}
        </div>

        {props.menuItem.isAvailable && count > 0 && (
          <div className="px-4 w-full flex py-2">
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
                "Modifier les suppléments"
              )}
            </button>
          </div>
        )}

        <div className="flex justify-between items-end pb-1 w-full flex-1">
          <p className="font-bold px-4 text-black text-base lg:text-lg">
            {/* {props.menuItem?.price} */} {props.itemPrice ? props.itemPrice : props.menuItem?.price}
            &nbsp; DZD
          </p>

          {props.isStatic && (
            <p className="font-bold self-center px-2 sm:px-4 text-black text-sm sm:text-base lg:text-lg">
              {props.count || count}
            </p>
          )}

          {!props.isStatic && (
            <div className="flex flex-col gap-2 px-2">
              {props.menuItem.isAvailable ? (
                <div className="flex items-center">
                  {/* {props.deleteButton && (
                    <div
                      className={`flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-[2.5rem] md:h-[2.5rem] border rounded-[25px] bg-red-500 ml-1 sm:ml-2`}
                      onClick={removeOnClick}
                    >
                      <p className="text-[var(--removeButtonText)] text-base sm:text-lg md:text-2xl font-medium leading-none">
                        -
                      </p>
                    </div>
                  )} */}

                  {props.deleteButton && (
                    // <div
                    //   className={`flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-[2.5rem] md:h-[2.5rem] border rounded-[25px] bg-red-500 ml-1 sm:ml-2`}
                    //   onClick={removeOnClick}
                    // >
                    //   <p className="text-[var(--removeButtonText)] text-base sm:text-lg md:text-2xl font-medium leading-none">
                    //     -
                    //   </p>
                    // </div>
                    <Icon iconname="minus" onClick={removeOnClick} />
                  )}

                  <p className="font-bold self-center px-2 sm:px-4 text-black text-sm sm:text-base lg:text-lg">
                    {count}
                  </p>

                  <Icon iconname="add" color="#4bbcbc" onClick={addOnClick} />

                  {/* 
                  <div
                    className={`flex justify-center items-center w-7 h-7 sm:w-8 sm:h-8 md:w-[2.5rem] md:h-[2.5rem] border rounded-[25px] bg-[var(--addButtonBackground)]`}
                    onClick={addOnClick}
                  >
                    <p className="text-[var(--addButtonText)] text-base sm:text-lg md:text-2xl font-medium leading-none">
                      +
                    </p>
                  </div> */}
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
