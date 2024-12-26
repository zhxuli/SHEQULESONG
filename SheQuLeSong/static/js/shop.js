        // 配置axios以支持cookie认证
        axios.defaults.withCredentials = true;

        new Vue({
            el: '#app',
            data: {
                siteId: null,
                siteName: '',
                username: '',
                activeMenu: 'orders',
                isAdmin: false,
                // 员工管理
                staffList: [],
                addStaffDialogVisible: false,
                staffForm: {
                    username: '',
                    permissions: []
                },
                editPermissionsDialogVisible: false,
                editPermissionsForm: {
                    staffId: null,
                    permissions: []
                },
                permissionLabels: {
                    'ORDER': '接单权限',
                    'DELIVERY': '配送权限',
                    'ORDER_MANAGE': '订单管理权限',
                    'MENU_MANAGE': '菜单管理权限',
                    'ADDRESS_MANAGE': '地址管理权限'
                },
                // 站点设置
                siteSettings: {
                    name: '',
                    address: '',
                    phone: '',
                    wechat: '',
                    description: '',
                    business_hours: '',
                    is_open: true
                },
                // 地址管理
                communities: [],
                addCommunityDialogVisible: false,
                communityForm: {
                    name: '',
                    address: '',
                    note: ''
                },
                editCommunityDialogVisible: false,
                editCommunityForm: {
                    id: null,
                    name: '',
                    address: '',
                    note: ''
                },
                addBuildingDialogVisible: false,
                buildingForm: {
                    communityId: null,
                    name: '',
                    note: '',
                    startNum: 1,
                    endNum: 1,
                    suffix: '号楼'
                },
                editBuildingDialogVisible: false,
                editBuildingForm: {
                    id: null,
                    communityId: null,
                    name: '',
                    note: ''
                },
                // 菜单管理
                menuItems: [],
                addMenuItemDialogVisible: false,
                menuItemForm: {
                    name: '',
                    price: 0,
                    description: '',
                    note: '',
                    options: []
                },
                editMenuItemDialogVisible: false,
                editMenuItemForm: {
                    id: null,
                    name: '',
                    price: 0,
                    description: '',
                    note: '',
                    is_available: true,
                    options: []
                },
                buildingAddMode: 'single',
                orderTab: 'list',
                orders: [],
                selectedOrders: [],
                createOrderDialogVisible: false,
                orderForm: {
                    customer_name: '',
                    room_number: '',
                    customer_phone: '',
                    building_id: null,
                    delivery_time: '',
                    note: '',
                    is_paid: false,
                    status: 'ordered',
                    items: []
                },
                addressOptions: [],
                totalAmount: 0,
                orderStatusFilter: 'all',
                userPermissions: [], // 用户权限列表
                isAdmin: false,     // 是管理员
                role: '',          // 用户角色
                isMobileView: false,
                menuItemFilter: '', // 菜品筛选
                communityFilter: '', // 小区筛选
                deliveryStatusFilter: 'all',
                orderSortOption: 'time', // 默认按时间排序
            },
            computed: {
                filteredOrders() {
                    let sortedOrders = this.orders.slice();
                    if (this.orderSortOption === 'time') {
                        sortedOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    } else if (this.orderSortOption === 'community') {
                        sortedOrders.sort((a, b) => {
                            if (a.building.community_name === b.building.community_name) {
                                return a.building.name.localeCompare(b.building.name);
                            }
                            return a.building.community_name.localeCompare(b.building.community_name);
                        });
                    }
                    return sortedOrders;
                },
                myDeliveries() {
                    return this.orders.filter(order => 
                        order.deliverer === this.username && 
                        ['delivering', 'completed'].includes(order.status)
                    );
                },
                filteredDeliveries() {
                    if (this.deliveryStatusFilter === 'all') {
                        return this.myDeliveries;
                    }
                    return this.myDeliveries.filter(order => order.status === this.deliveryStatusFilter);
                },
                sortedOrders() {
                    if (this.orderSortOption === 'time') {
                        return this.orders.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                    } else if (this.orderSortOption === 'community') {
                        return this.orders.slice().sort((a, b) => {
                            if (a.building.community_name === b.building.community_name) {
                                return a.building.name.localeCompare(b.building.name);
                            }
                            return a.building.community_name.localeCompare(b.building.community_name);
                        });
                    }
                    return this.orders;
                }
            },
            async created() {
                // 获取站点ID
                const pathParts = window.location.pathname.split('/');
                this.siteId = pathParts[pathParts.length - 1];

                try {
                    // 先获取用户信息和权限
                    await this.fetchUserInfo();
                    
                    // 所有员工都需要获取地址数据和菜单数据（用于创建订单）
                    await this.fetchCommunities();
                    await this.fetchMenuItems();
                    
                    // 根据权限加载其他数据
                    if (this.isAdmin) {
                        // 管理员加载管理相关数据
                        await this.fetchStaffList();
                        await this.fetchSiteSettings();
                        await this.fetchOrders();
                    } else {
                        // 员工根据权限加载数据
                        if (this.hasPermission('ORDER_MANAGE')) {
                            await this.fetchOrders();
                        }
                        if (this.hasPermission('MENU_MANAGE')) {
                            await this.fetchMenuItems();
                        }
                        if (this.hasPermission('ADDRESS_MANAGE')) {
                            await this.fetchCommunities();
                        }
                    }
                } catch (error) {
                    console.error('初始化错误:', error.response || error);
                    this.$message.error('您没有权限访问该站点');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                }

                // 监听窗口大小变化
                window.addEventListener('resize', () => {
                    this.handleResize();
                });
            },
            methods: {
                handleSelect(key) {
                    this.activeMenu = key;
                },
                goBack() {
                    window.location.href = '/';
                },
                async logout() {
                    try {
                        await axios.post('/logout');
                        localStorage.removeItem('username');
                        window.location.href = '/';
                    } catch (error) {
                        console.error('Logout error:', error.response || error);
                        this.$message.error('退出失败');
                    }
                },
                // 员工管理方法
                async fetchStaffList() {
                    try {
                        const response = await axios.get(`/sites/${this.siteId}/staff`);
                        this.staffList = response.data;
                    } catch (error) {
                        console.error('Fetch staff error:', error);
                        this.$message.error('获取员工列表失败');
                    }
                },
                showAddStaffDialog() {
                    this.staffForm = {
                        username: '',
                        permissions: []
                    };
                    this.addStaffDialogVisible = true;
                },
                async addStaff() {
                    try {
                        await axios.post(`/sites/${this.siteId}/staff`, {
                            username: this.staffForm.username,
                            permissions: this.staffForm.permissions
                        });
                        this.$message.success('添加员工成功');
                        this.addStaffDialogVisible = false;
                        await this.fetchStaffList();
                    } catch (error) {
                        console.error('Add staff error:', error);
                        this.$message.error(error.response?.data?.detail || '添加员工失败');
                    }
                },
                showEditPermissionsDialog(staff) {
                    this.editPermissionsForm = {
                        staffId: staff.id,
                        permissions: staff.permissions
                    };
                    this.editPermissionsDialogVisible = true;
                },
                async updatePermissions() {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/staff/${this.editPermissionsForm.staffId}`,
                            this.editPermissionsForm.permissions
                        );
                        this.$message.success('更新权限成功');
                        this.editPermissionsDialogVisible = false;
                        await this.fetchStaffList();
                    } catch (error) {
                        console.error('Update permissions error:', error);
                        this.$message.error('更新权限失败');
                    }
                },
                async removeStaff(staff) {
                    try {
                        await this.$confirm('确定要移除该员工吗？');
                        await axios.delete(`/sites/${this.siteId}/staff/${staff.id}`);
                        this.$message.success('移除员工成功');
                        await this.fetchStaffList();
                    } catch (error) {
                        if (error !== 'cancel') {
                            console.error('Remove staff error:', error);
                            this.$message.error('移除员工失败');
                        }
                    }
                },
                // 站点设置方法
                async fetchSiteSettings() {
                    try {
                        const response = await axios.get(`/sites/${this.siteId}`);
                        this.siteSettings = response.data;
                    } catch (error) {
                        console.error('Fetch site settings error:', error);
                        this.$message.error('获取站点设置失败');
                    }
                },
                async updateSiteSettings() {
                    try {
                        await axios.put(`/sites/${this.siteId}`, {
                            name: this.siteSettings.name,
                            address: this.siteSettings.address,
                            phone: this.siteSettings.phone,
                            wechat: this.siteSettings.wechat,
                            is_open: this.siteSettings.is_open,
                            description: this.siteSettings.description,
                            business_hours: this.siteSettings.business_hours
                        });
                        this.$message.success('更新站点设置成功');
                    } catch (error) {
                        console.error('Update site settings error:', error);
                        this.$message.error('更新站点设置失败');
                    }
                },
                // 地址管理方法
                async fetchCommunities() {
                    try {
                        const response = await axios.get(`/sites/${this.siteId}/communities`);
                        this.communities = response.data;
                    } catch (error) {
                        console.error('Fetch communities error:', error);
                        this.$message.error('获取小区列表失败');
                    }
                },
                showAddCommunityDialog() {
                    this.communityForm = {
                        name: '',
                        address: '',
                        note: ''
                    };
                    this.addCommunityDialogVisible = true;
                },
                async createCommunity() {
                    try {
                        await axios.post(`/sites/${this.siteId}/communities`, this.communityForm);
                        this.$message.success('小区创建成功');
                        this.addCommunityDialogVisible = false;
                        await this.fetchCommunities();
                    } catch (error) {
                        console.error('Create community error:', error);
                        this.$message.error(error.response?.data?.detail || '创建小区失败');
                    }
                },
                showEditCommunityDialog(community) {
                    this.editCommunityForm = {
                        id: community.id,
                        name: community.name,
                        address: community.address,
                        note: community.note
                    };
                    this.editCommunityDialogVisible = true;
                },
                async updateCommunity() {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/communities/${this.editCommunityForm.id}`,
                            this.editCommunityForm
                        );
                        this.$message.success('小区信息更新成功');
                        this.editCommunityDialogVisible = false;
                        await this.fetchCommunities();
                    } catch (error) {
                        console.error('Update community error:', error);
                        this.$message.error('更新小区信息失败');
                    }
                },
                async deleteCommunity(community) {
                    try {
                        await this.$confirm('确定要删除该小区吗？这将同时删除所有楼栋信息。');
                        await axios.delete(`/sites/${this.siteId}/communities/${community.id}`);
                        this.$message.success('小区删除成功');
                        await this.fetchCommunities();
                    } catch (error) {
                        if (error !== 'cancel') {
                            console.error('Delete community error:', error);
                            this.$message.error('删除小区失败');
                        }
                    }
                },
                showAddBuildingDialog(community) {
                    this.buildingForm = {
                        communityId: community.id,
                        name: '',
                        note: '',
                        startNum: 1,
                        endNum: 1,
                        suffix: '号楼'
                    };
                    this.buildingAddMode = 'single';
                    this.addBuildingDialogVisible = true;
                },
                async createBuilding() {
                    try {
                        if (this.buildingAddMode === 'single') {
                            await axios.post(
                                `/sites/${this.siteId}/communities/${this.buildingForm.communityId}/buildings`,
                                {
                                    name: this.buildingForm.name,
                                    note: this.buildingForm.note
                                }
                            );
                            this.$message.success('楼栋创建成功');
                        } else {
                            const response = await axios.post(
                                `/sites/${this.siteId}/communities/${this.buildingForm.communityId}/buildings/batch`,
                                {
                                    start_num: this.buildingForm.startNum,
                                    end_num: this.buildingForm.endNum,
                                    suffix: this.buildingForm.suffix,
                                    note: this.buildingForm.note
                                }
                            );
                            this.$message.success(
                                `批量创建完成：成功创建${response.data.created_count}个，过${response.data.skipped_count}个`
                            );
                        }
                        this.addBuildingDialogVisible = false;
                        await this.fetchCommunities();
                    } catch (error) {
                        console.error('Create building error:', error);
                        this.$message.error(error.response?.data?.detail || '创建楼栋失败');
                    }
                },
                showEditBuildingDialog(community, building) {
                    this.editBuildingForm = {
                        id: building.id,
                        communityId: community.id,
                        name: building.name,
                        note: building.note
                    };
                    this.editBuildingDialogVisible = true;
                },
                async updateBuilding() {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/communities/${this.editBuildingForm.communityId}/buildings/${this.editBuildingForm.id}`,
                            {
                                name: this.editBuildingForm.name,
                                note: this.editBuildingForm.note
                            }
                        );
                        this.$message.success('楼栋信息更新成功');
                        this.editBuildingDialogVisible = false;
                        await this.fetchCommunities();
                    } catch (error) {
                        console.error('Update building error:', error);
                        this.$message.error('更新楼栋信息失败');
                    }
                },
                async deleteBuilding(community, building) {
                    try {
                        await this.$confirm('确定要删除该楼栋吗？');
                        await axios.delete(
                            `/sites/${this.siteId}/communities/${community.id}/buildings/${building.id}`
                        );
                        this.$message.success('楼栋删除成功');
                        await this.fetchCommunities();
                    } catch (error) {
                        if (error !== 'cancel') {
                            console.error('Delete building error:', error);
                            this.$message.error('删除楼栋失败');
                        }
                    }
                },
                // 菜单管理方法
                async fetchMenuItems() {
                    try {
                        const response = await axios.get(`/sites/${this.siteId}/menu-items`);
                        this.menuItems = response.data;
                    } catch (error) {
                        console.error('Fetch menu items error:', error);
                        this.$message.error('获取菜单列表失败');
                    }
                },
                showAddMenuItemDialog() {
                    this.menuItemForm = {
                        name: '',
                        price: 0,
                        description: '',
                        note: '',
                        options: []
                    };
                    this.addMenuItemDialogVisible = true;
                },
                async createMenuItem() {
                    try {
                        await axios.post(`/sites/${this.siteId}/menu-items`, this.menuItemForm);
                        this.$message.success('菜品创建成功');
                        this.addMenuItemDialogVisible = false;
                        await this.fetchMenuItems();
                    } catch (error) {
                        console.error('Create menu item error:', error);
                        this.$message.error(error.response?.data?.detail || '创建菜品失败');
                    }
                },
                showEditMenuItemDialog(menuItem) {
                    this.editMenuItemForm = {
                        id: menuItem.id,
                        name: menuItem.name,
                        price: parseFloat(menuItem.price),
                        description: menuItem.description,
                        note: menuItem.note,
                        is_available: menuItem.is_available,
                        options: menuItem.options.map(option => ({
                            name: option.name,
                            price: parseFloat(option.price),
                            description: option.description
                        }))
                    };
                    this.editMenuItemDialogVisible = true;
                },
                async updateMenuItem() {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/menu-items/${this.editMenuItemForm.id}`,
                            this.editMenuItemForm
                        );
                        this.$message.success('菜品信息更新成功');
                        this.editMenuItemDialogVisible = false;
                        await this.fetchMenuItems();
                    } catch (error) {
                        console.error('Update menu item error:', error);
                        this.$message.error('更新菜品信息失败');
                    }
                },
                async deleteMenuItem(menuItem) {
                    try {
                        await this.$confirm('确定要删除该菜品吗？');
                        await axios.delete(`/sites/${this.siteId}/menu-items/${menuItem.id}`);
                        this.$message.success('菜品删除成功');
                        await this.fetchMenuItems();
                    } catch (error) {
                        if (error !== 'cancel') {
                            console.error('Delete menu item error:', error);
                            this.$message.error('删除菜品失败');
                        }
                    }
                },
                // 菜品选项管理方法
                addOption() {
                    this.menuItemForm.options.push({
                        name: '',
                        price: 0,
                        description: ''
                    });
                },
                removeOption(index) {
                    this.menuItemForm.options.splice(index, 1);
                },
                addEditOption() {
                    this.editMenuItemForm.options.push({
                        name: '',
                        price: 0,
                        description: ''
                    });
                },
                removeEditOption(index) {
                    this.editMenuItemForm.options.splice(index, 1);
                },
                // 订单管理方法
                async fetchOrders() {
                    try {
                        // 确保已经加载了菜品信息
                        if (this.menuItems.length === 0) {
                            await this.fetchMenuItems();
                        }
                        const response = await axios.get(`/sites/${this.siteId}/orders`);
                        this.orders = response.data;
                    } catch (error) {
                        console.error('Fetch orders error:', error);
                        this.$message.error('获取订单列表失败');
                    }
                },
                showCreateOrderDialog() {
                    this.orderForm = {
                        customer_name: '',
                        room_number: '',
                        customer_phone: '',
                        building_id: null,
                        delivery_time: '',
                        note: '',
                        is_paid: false,
                        status: 'ordered',
                        items: [{
                            menu_item_id: null,
                            quantity: 1,
                            selected_options: []
                        }]
                    };
                    this.totalAmount = 0;
                    this.fetchAddressOptions();
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
                    // 清空该的已选选项
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
                        if (!item.menu_item_id) continue;
                        
                        const menuItem = this.menuItems.find(mi => mi.id === item.menu_item_id);
                        if (!menuItem) continue;
                        
                        // 基础价格
                        let itemPrice = parseFloat(menuItem.price) || 0;
                        
                        // 添加选项价格（如果选择选项的话）
                        if (item.selected_options && item.selected_options.length > 0) {
                            for (const optionId of item.selected_options) {
                                const option = menuItem.options.find(opt => opt.id === optionId);
                                if (option) {
                                    itemPrice += parseFloat(option.price) || 0;
                                }
                            }
                        }
                        
                        // 乘以数量
                        total += itemPrice * (item.quantity || 1);
                    }
                    this.totalAmount = total.toFixed(2);
                },
                async createOrder() {
                    const actualBuildingId = Array.isArray(this.orderForm.building_id) 
                        ? this.orderForm.building_id[this.orderForm.building_id.length - 1]
                        : this.orderForm.building_id;

                    if (!actualBuildingId) {
                        this.$message.warning('请选择配送地址');
                        return;
                    }
                    
                    try {
                        if (this.orderForm.id) {
                            // 如果是编辑订单，发送完整的更新数据
                            await axios.put(
                                `/sites/${this.siteId}/orders/${this.orderForm.id}`,
                                {
                                    ...this.orderForm,
                                    building_id: actualBuildingId,
                                    delivery_time: this.orderForm.delivery_time ? this.orderForm.delivery_time.toISOString() : null
                                }
                            );
                            this.$message.success('订单更新成功');
                        } else {
                            // 如果是新建订单
                            const response = await axios.post(
                                `/sites/${this.siteId}/orders`,
                                {
                                    ...this.orderForm,
                                    building_id: actualBuildingId,
                                    delivery_time: this.orderForm.delivery_time ? this.orderForm.delivery_time.toISOString() : null,
                                    status: this.orderForm.status
                                }
                            );
                            this.$message.success('订单创建成功');
                        }
                        
                        this.createOrderDialogVisible = false;
                        this.fetchOrders();
                    } catch (error) {
                        console.error('Order operation error:', error);
                        this.$message.error(error.response?.data?.detail || (this.orderForm.id ? '更新订单失败' : '创建订单失败'));
                    }
                },
                handleOrderSelectionChange(selection) {
                    this.selectedOrders = selection;
                },
                async startDelivery() {
                    try {
                        for (const order of this.selectedOrders) {
                            await axios.put(
                                `/sites/${this.siteId}/orders/${order.id}/status`,
                                { status: 'delivering' }
                            );
                        }
                        this.$message.success('开始派送');
                        await this.fetchOrders();
                    } catch (error) {
                        console.error('Start delivery error:', error);
                        this.$message.error('开始派送失败');
                    }
                },
                async completeOrder(order) {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/orders/${order.id}/status`,
                            { status: 'completed' }
                        );
                        this.$message.success('订单已完成');
                        await this.fetchOrders();
                    } catch (error) {
                        console.error('Complete order error:', error);
                        this.$message.error('完成订单失败');
                    }
                },
                async cancelDelivery(order) {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/orders/${order.id}/status`,
                            { status: 'ordered' }
                        );
                        this.$message.success('已取消派送');
                        await this.fetchOrders();
                    } catch (error) {
                        console.error('Cancel delivery error:', error);
                        this.$message.error('取消派送失败');
                    }
                },
                getOrderStatusType(status) {
                    const types = {
                        'ordered': 'info',
                        'delivering': 'warning',
                        'completed': 'success',
                        'cancelled': 'danger'
                    };
                    return types[status] || 'info';
                },
                getOrderStatusText(status) {
                    const texts = {
                        'ordered': '待派送',
                        'delivering': '派送中',
                        'completed': '已完成',
                        'cancelled': '已取消'
                    };
                    return texts[status] || status;
                },
                formatDate(dateStr) {
                    if (!dateStr) return '';  // 如果日期为空，返回空字符串
                    const date = new Date(dateStr);
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                },
                async fetchAddressOptions() {
                    try {
                        const response = await axios.get(`/sites/${this.siteId}/communities`);
                        this.addressOptions = response.data.map(community => ({
                            id: community.id,
                            name: community.name,
                            buildings: community.buildings.map(building => ({
                                id: building.id,
                                name: building.name
                            }))
                        }));
                    } catch (error) {
                        console.error('Fetch address options error:', error);
                        this.$message.error('获取地址列表失败');
                    }
                },
                calculateOrderTotal(order) {
                    let total = 0;
                    if (!order.items) return total.toFixed(2);
                    
                    for (const item of order.items) {
                        // 获取菜品信息
                        const menuItem = this.menuItems.find(mi => mi.id === item.menu_item.id);
                        if (!menuItem) continue;
                        
                        // 基础价格
                        let itemPrice = parseFloat(menuItem.price) || 0;
                        
                        // 添加选项价格
                        if (item.selected_options && item.selected_options.length > 0) {
                            for (const option of item.selected_options) {
                                itemPrice += parseFloat(option.price) || 0;
                            }
                        }
                        
                        // 乘以数量
                        total += itemPrice * (parseInt(item.quantity) || 1);
                    }
                    return total.toFixed(2);
                },
                // 编辑订单
                async editOrder(order) {
                    try {
                        // 先获取地址选项
                        await this.fetchAddressOptions();
                        
                        // 准备级联选择器的值
                        let buildingId = null;
                        if (order.building) {
                            // 从小区列表中找到对应的小区
                            const community = this.addressOptions.find(c => c.name === order.building.community_name);
                            if (community) {
                                buildingId = [community.id, order.building.id];
                            }
                        }
                        
                        // 设置表单数据
                        this.orderForm = {
                            id: order.id,  // 确保设置订单ID
                            created_at: order.created_at, // 添加下单时间
                            customer_name: order.customer_name || '',
                            room_number: order.room_number || '',
                            customer_phone: order.customer_phone || '',
                            building_id: buildingId,
                            delivery_time: order.delivery_time ? new Date(order.delivery_time) : '',
                            note: order.note || '',
                            is_paid: order.is_paid || false,
                            status: order.status || 'ordered',
                            items: order.items?.map(item => ({
                                menu_item_id: item.menu_item?.id,
                                quantity: item.quantity || 1,
                                selected_options: item.selected_options?.map(opt => opt.id) || []
                            })) || []
                        };
                        
                        this.calculateTotal();
                        this.createOrderDialogVisible = true;
                    } catch (error) {
                        console.error('编辑订单错误:', error);
                        this.$message.error('加载订单数据失败');
                    }
                },
                async deleteOrder(order) {
                    try {
                        await this.$confirm('确定要删除该订单吗？此操作不可恢复', '提示', {
                            confirmButtonText: '确定',
                            cancelButtonText: '取消',
                            type: 'warning'
                        });
                        
                        const response = await axios.delete(`/sites/${this.siteId}/orders/${order.id}`);
                        this.$message.success('订单删除成功');
                        await this.fetchOrders();
                        this.createOrderDialogVisible = false;
                    } catch (error) {
                        if (error !== 'cancel') {
                            console.error('Delete order error:', error);
                            this.$message.error(error.response?.data?.detail || '删除订单失败');
                        }
                    }
                },
                handleStatusFilterChange(value) {
                    this.orderStatusFilter = value;
                    // 可以在这里添加其他筛选逻辑，如果需要的话
                },
                hasPermission(permission) {
                    return this.isAdmin || (this.userPermissions && this.userPermissions.includes(permission));
                },
                // 获取用户信息和权限
                async fetchUserInfo() {
                    try {
                        const response = await axios.get(`/sites/${this.siteId}/staff/current`);
                        console.log('用户信息:', response.data); // 调试用
                        this.username = response.data.username;
                        this.role = response.data.role;
                        this.isAdmin = response.data.role === 'admin';
                        this.userPermissions = response.data.permissions || [];
                        console.log('权限列表:', this.userPermissions); // 调试用
                    } catch (error) {
                        console.error('获取用户信息失败:', error);
                        this.$message.error('获取用户信息失败');
                    }
                },
                // 初始化方法
                async init() {
                    await this.fetchUserInfo();
                    // ... 其他初始化代码
                },
                // 修改地址管理相关的按钮显示逻辑
                canManageAddress() {
                    return this.isAdmin || this.hasPermission('ADDRESS_MANAGE');
                },
                // 检测是否为移动端
                isMobile() {
                    return window.innerWidth <= 768;
                },
                
                // 调整表格列的显示
                getTableColumns() {
                    if (this.isMobile()) {
                        return [
                            // 移动端显示精简的列
                            { prop: 'name', label: '名称' },
                            { prop: 'status', label: '状态' },
                            { prop: 'operation', label: '操作' }
                        ];
                    } else {
                        return [
                            // 桌面端显示完整的列
                            // ... 原有的列配置
                        ];
                    }
                },
                
                // 优化对话框大小
                getDialogWidth() {
                    return this.isMobile() ? '95%' : '50%';
                },
                checkDeviceType() {
                    this.isMobileView = window.innerWidth <= 768;
                },
                
                handleResize() {
                    this.checkDeviceType();
                    this.$nextTick(() => {
                        this.adjustLayout();
                    });
                },
                
                adjustLayout() {
                    if (this.isMobileView) {
                        this.adjustMobileLayout();
                    } else {
                        this.adjustDesktopLayout();
                    }
                },
                
                // 调整移动端布局
                adjustMobileLayout() {
                    this.$nextTick(() => {
                        // 调整表格显示
                        const tables = document.querySelectorAll('.el-table');
                        tables.forEach(table => {
                            const cells = table.querySelectorAll('.cell');
                            cells.forEach(cell => {
                                cell.style.padding = '5px';
                            });
                        });
                        
                        // 调整按钮组布局
                        const buttonGroups = document.querySelectorAll('.button-group');
                        buttonGroups.forEach(group => {
                            group.style.flexDirection = 'column';
                        });
                    });
                },
                
                // 调整桌面端布局
                adjustDesktopLayout() {
                    this.$nextTick(() => {
                        // 重置移动端特定样式
                        const buttonGroups = document.querySelectorAll('.button-group');
                        buttonGroups.forEach(group => {
                            group.style.flexDirection = 'row';
                        });
                    });
                },
                
                // 格式化移动端显示内容
                formatMobileContent(content, type) {
                    if (!content) return '';
                    switch(type) {
                        case 'address':
                            return `${content.community || ''} ${content.building || ''} ${content.room || ''}`;
                        case 'datetime':
                            if (!content) return '';  // 如果日期为空，返回空字符串
                            return this.formatDate(content);
                        case 'price':
                            return `¥${parseFloat(content).toFixed(2)}`;
                        default:
                            return content;
                    }
                },
                handleOrderSelect(order) {
                    // 如果选中订单，将其添加到选中列表
                    if (order.selected) {
                        this.selectedOrders.push(order);
                    } else {
                        // 果取消选中，从列表中移除
                        const index = this.selectedOrders.findIndex(o => o.id === order.id);
                        if (index > -1) {
                            this.selectedOrders.splice(index, 1);
                        }
                    }
                },
                handleMenuItemFilterChange() {
                    // 当菜品筛选改变时，可以在这里添加额外的处理逻辑
                    console.log('菜品筛选已更改:', this.menuItemFilter);
                },
                handleCommunityFilterChange() {
                    // 当小区筛选改变时，可以在这里添加额外的处理逻辑
                    console.log('小区筛选已更改:', this.communityFilter);
                },
                getMenuItemCount(menuItemId) {
                    // 计算指定菜品在待派送订单中出现的总数
                    let count = 0;
                    this.orders.forEach(order => {
                        // 只统计待派送状态的订单
                        if (order.status === 'ordered') {
                            order.items.forEach(item => {
                                if (item.menu_item && item.menu_item.id === menuItemId) {
                                    count += parseInt(item.quantity) || 1;
                                }
                            });
                        }
                    });
                    return count;
                },
                async startSingleDelivery(order) {
                    try {
                        await axios.put(
                            `/sites/${this.siteId}/orders/${order.id}/status`,
                            { status: 'delivering' }
                        );
                        this.$message.success('开始派送');
                        await this.fetchOrders();
                    } catch (error) {
                        console.error('Start delivery error:', error);
                        this.$message.error('开始派送失败');
                    }
                },
                handleDeliveryStatusFilterChange() {
                    // 这里可以添加任何需要在筛选条件变化时执行的逻辑
                    console.log(`当前筛选状态: ${this.deliveryStatusFilter}`);
                },
                handleOrderSortChange() {
                    // 这里可以添加任何需要在排序条件变化时执行的逻辑
                    console.log(`当前排序方式: ${this.orderSortOption}`);
                },
            },
            async mounted() {
                await this.init();
            }
        });