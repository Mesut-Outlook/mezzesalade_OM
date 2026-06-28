import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../hooks/useLocalStorage';
import { calculateSubtotal, countItems, getOrderShortId, extractDeliveryTime, itemsPreview } from '../../utils/orderUtils';

/**
 * Reusable order card for order lists.
 * Extracts the duplicated pattern from OrderList, AllOrders, and CalendarDashboard.
 *
 * Props:
 * - order: order object with .id, .items, .status, .notes, .customerId, .total
 * - customerName: string
 * - statusLabel: string — translated status label
 * - moreText: string — text for "more" suffix in preview (default "daha...")
 * - showDeliveryTime: boolean (default true)
 * - onClick: () => void — override click handler (defaults to navigate to order detail)
 */
export default function OrderCard({
    order,
    customerName,
    statusLabel,
    moreText = 'daha...',
    showDeliveryTime = true,
    onClick
}) {
    const navigate = useNavigate();

    const totalItems = countItems(order.items);
    const totalPrice = order.total || calculateSubtotal(order.items);
    const { time: deliveryTime } = extractDeliveryTime(order.notes);

    const handleClick = onClick || (() => navigate(`/admin/order/${order.id}`));

    return (
        <div
            className="card mb-sm"
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
        >
            <div className="flex justify-between items-center">
                <div>
                    <div className="font-bold text-lg">{customerName}</div>
                    <div className="text-muted">
                        {totalItems} {totalItems === 1 ? 'ürün' : 'ürün'} • {getOrderShortId(order.id)}
                        {showDeliveryTime && deliveryTime && (
                            <span className="ml-xs">⏰ {deliveryTime}</span>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-success text-lg">{formatCurrency(totalPrice)}</div>
                    <span className={`badge badge-${order.status}`}>
                        {statusLabel}
                    </span>
                </div>
            </div>

            <div className="text-muted mt-sm" style={{ fontSize: '0.875rem' }}>
                {itemsPreview(order.items, 3, moreText)}
            </div>
        </div>
    );
}
