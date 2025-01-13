new Vue({
    el: '#app',
    data() {
        return {
            username: '',
            siteName: '',
            orderTab: 'list',
            orderStatusFilter: 'all',
            selectedOrders: [],
            orders: [],
            myDeliveries: [],
            menuItems: [],
            communities: [],
            createOrderDialogVisible: false,
            orderForm: {
                id: null,
                customer_name: '',
                customer_phone: '',
                room_number: '',
                building_id: null,
                delivery_time: '',
                note: '',
                is_paid: false,
                status: 'ordered',
                items: []
            },
            totalAmount: 0
        }
    },
    computed: {
        filteredOrders() {
            if (this.orderStatusFilter === 'all') {
                return this.orders;
            }
            return this.orders.filter(order => order.status === this.orderStatusFilter);
        },
        addressOptions() {
            return this.communities.map(community => ({
                id: community.id,
                name: community.name,
                buildings: community.buildings.map(building => ({
                    id: building.id,
                    name: building.name
                }))
            }));
        }
    },
    created() {
        this.checkAuth();
        this.loadOrders();
        this.loadMenuItems();
        this.loadCommunities();
    },
    methods: {
        async checkAuth() {
            try {
                const response = await axios.get('/api/auth/check');
                this.username = response.data.username;
                this.siteName = response.data.site_name;
            } catch (error) {
                this.$message.error('请先登录');
                window.location.href = '/static/login.html';
            }
        },
        async loadOrders() {
            try {
                const response = await axios.get('/api/orders');
                this.orders = response.data;
                this.loadMyDeliveries();
            } catch (error) {
                this.$message.error('加载订单失败');
            }
        },
        async loadMyDeliveries() {
            this.myDeliveries = this.orders.filter(order => 
                order.status === 'delivering' && order.deliverer === this.username
            );
        },
        async loadMenuItems() {
            try {
                const response = await axios.get('/api/menu-items');
                this.menuItems = response.data;
            } catch (error) {
                this.$message.error('加载菜单失败');
            }
        },
        async loadCommunities() {
            try {
                const response = await axios.get('/api/communities');
                this.communities = response.data;
            } catch (error) {
                this.$message.error('加载地址失败');
            }
        },
        handleStatusFilterChange(value) {
            this.orderStatusFilter = value;
        },
        handleOrderSelectionChange(selection) {
            this.selectedOrders = selection;
        },
        showCreateOrderDialog() {
            this.orderForm = {
                id: null,
                customer_name: '',
                customer_phone: '',
                room_number: '',
                building_id: null,
                delivery_time: '',
                note: '',
                is_paid: false,
                status: 'ordered',
                items: []
            };
            this.createOrderDialogVisible = true;
        },
        addOrderItem() {
            this.orderForm.items.push({
                menu_item_id: null,
                quantity: 1,
                selected_options: []
            });
        },
        removeOrderItem(index) {
            this.orderForm.items.splice(index, 1);
            this.calculateTotal();
        },
        handleMenuItemSelect(index) {
            this.orderForm.items[index].selected_options = [];
            this.calculateTotal();
        },
        getMenuItemOptions(menuItemId) {
            const menuItem = this.menuItems.find(item => item.id === menuItemId);
            return menuItem ? menuItem.options : [];
        },
        calculateTotal() {
            let total = 0;
            for (const item of this.orderForm.items) {
                const menuItem = this.menuItems.find(mi => mi.id === item.menu_item_id);
                if (menuItem) {
                    total += menuItem.price * item.quantity;
                    
                    // 计算选项的额外费用
                    for (const optionId of item.selected_options) {
                        const option = menuItem.options.find(opt => opt.id === optionId);
                        if (option) {
                            total += option.price * item.quantity;
                        }
                    }
                }
            }
            this.totalAmount = total.toFixed(2);
        },
        calculateOrderTotal(order) {
            let total = 0;
            for (const item of order.items || []) {
                if (item.menu_item) {
                    total += item.menu_item.price * item.quantity;
                    
                    // 计算选项的额外费用
                    for (const option of item.selected_options || []) {
                        total += option.price * item.quantity;
                    }
                }
            }
            return total.toFixed(2);
        },
        async createOrder() {
            try {
                if (this.orderForm.id) {
                    await axios.put(`/api/orders/${this.orderForm.id}`, this.orderForm);
                    this.$message.success('订单更新成功');
                } else {
                    await axios.post('/api/orders', this.orderForm);
                    this.$message.success('订单创建成功');
                }
                this.createOrderDialogVisible = false;
                this.loadOrders();
            } catch (error) {
                this.$message.error(error.response?.data?.detail || '操作失败');
            }
        },
        editOrder(order) {
            this.orderForm = {
                id: order.id,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                room_number: order.room_number,
                building_id: order.building_id,
                delivery_time: order.delivery_time,
                note: order.note,
                is_paid: order.is_paid,
                status: order.status,
                items: order.items.map(item => ({
                    menu_item_id: item.menu_item.id,
                    quantity: item.quantity,
                    selected_options: item.selected_options.map(opt => opt.id)
                }))
            };
            this.calculateTotal();
            this.createOrderDialogVisible = true;
        },
        async deleteOrder(order) {
            try {
                await this.$confirm('确认删除该订单?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
                
                await axios.delete(`/api/orders/${order.id}`);
                this.$message.success('删除成功');
                this.loadOrders();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败');
                }
            }
        },
        async startDelivery() {
            try {
                const orderIds = this.selectedOrders.map(order => order.id);
                await axios.post('/api/orders/start-delivery', { order_ids: orderIds });
                this.$message.success('开始派送');
                this.loadOrders();
            } catch (error) {
                this.$message.error(error.response?.data?.detail || '操作失败');
            }
        },
        async completeOrder(order) {
            try {
                await axios.post(`/api/orders/${order.id}/complete`);
                this.$message.success('订单已完成');
                this.loadOrders();
            } catch (error) {
                this.$message.error('操作失败');
            }
        },
        async cancelDelivery(order) {
            try {
                await axios.post(`/api/orders/${order.id}/cancel-delivery`);
                this.$message.success('已取消派送');
                this.loadOrders();
            } catch (error) {
                this.$message.error('操作失败');
            }
        },
        getOrderStatusType(status) {
            const types = {
                'ordered': 'info',
                'delivering': 'warning',
                'completed': 'success'
            };
            return types[status] || 'info';
        },
        getOrderStatusText(status) {
            const texts = {
                'ordered': '待派送',
                'delivering': '派送中',
                'completed': '已送达'
            };
            return texts[status] || status;
        },
        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleString();
        },
        goBack() {
            window.location.href = '/static/shop.html';
        },
        async logout() {
            try {
                await axios.post('/api/auth/logout');
                window.location.href = '/static/login.html';
            } catch (error) {
                this.$message.error('退出失败');
            }
        }
    }
}); 