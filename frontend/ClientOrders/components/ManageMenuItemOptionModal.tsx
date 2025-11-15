import type { ModalProps } from "../../../_enums";
import Modal from "../../../components/Modal";
import { __actions } from "../../../store/actions/index.actions";

interface SelectTableModalProps extends ModalProps {
  menuItem: any;
  confirmMenuItemOptions: (menuItemOptions: any[]) => void;
}

const ManageMenuItemOptionModal = (props: SelectTableModalProps) => {
  // const [selectedOptions, setSelectedOptions] = React.useState<any[]>([]);

  // function handleOptionSelect(option: any) {
  //   setSelectedOptions((prev) => {
  //     if (prev.some((o) => o.id === option.id)) {
  //       return prev.filter((o) => o.id !== option.id);
  //     }
  //     return [...prev, option];
  //   });
  // }

  return (
    <Modal isOpen={props.isOpen} setIsOpen={() => {}}>
      <div className="flex flex-col gap-y-4 p-6 max-w-4xl">
        {/* <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Gérer les Suppléments - {props.menuItem.name}</h2>
          <button
            onClick={() => props.setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div> */}

        <h2 className="text-2xl font-bold text-gray-900">
          Sélectionnez une option pour {props.menuItem.name}
        </h2>

        <div className="space-y-4">
          {props.menuItem.menuItemMenuItemOption?.length > 0 ? (
            props.menuItem.menuItemMenuItemOption.map(({ option }: any) => {
              return (
                <div key={option.id} className="flex items-center justify-between">
                  <span className="text-gray-800 font-semibold text-l">{option.name}</span>
                  <button
                    onClick={() => {
                      props.confirmMenuItemOptions([option]);
                      props.setIsOpen(false);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    Sélectionner
                  </button>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">Aucune option de supplément disponible pour cet article.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ManageMenuItemOptionModal;
