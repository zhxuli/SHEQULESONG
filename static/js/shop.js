// 配置axios以支持cookie认证
axios.defaults.withCredentials = true;

var app = new Vue({
    el: '#app',
    data: {
        siteId: null, // 当前站点ID
        siteName: '', // 当前站点名称
        username: '', // 当前用户的用户名
        activeMenu: 'orders', // 当前激活的菜单项
        isAdmin: false, // 是否为管理员
        // 员工管理
        staffList: [], // 员工列表
        addStaffDialogVisible: false, // 添加员工对话框是否可见
        staffForm: { // 员工表单
            username: '', // 员工用户名
            permissions: [] // 员工权限
        },
        editPermissionsDialogVisible: false, // 编辑权限对话框是否可见
        editPermissionsForm: { // 编辑权限表单
            staffId: null, // 员工ID
            permissions: [] // 员工权限
        },
        permissionLabels: { // 权限标签
            'ORDER': '接单权限',
            'DELIVERY': '配送权限',
            'ORDER_MANAGE': '订单管理权限',
            'MENU_MANAGE': '菜单管理权限',
            'ADDRESS_MANAGE': '地址管理权限'
        },
        // 站点设置
        siteSettings: { // 站点设置
            name: '', // 站点名称
            address: '', // 站点地址
            phone: '', // 联系电话
            wechat: '', // 微信号
            description: '', // 站点描述
            business_hours: '', // 营业时间
            is_open: true // 是否营业
        },
        // 地址管理
        communities: [], // 小区列表
        addCommunityDialogVisible: false, // 添加小区对话框是否可见
        communityForm: { // 小区表单
            name: '', // 小区名称
            address: '', // 小区地址
            note: '' // 备注
        },
        editCommunityDialogVisible: false, // 编辑小区对话框是否可见
        editCommunityForm: { // 编辑小区表单
            id: null, // 小区ID
            name: '', // 小区名称
            address: '', // 小区地址
            note: '' // 备注
        },
        addBuildingDialogVisible: false, // 添加楼栋对话框是否可见
        buildingForm: { // 楼栋表单
            communityId: null, // 所属小区ID
            name: '', // 楼栋名称
            note: '', // 备注
            startNum: 1, // 起始编号
            endNum: 1, // 结束编号
            suffix: '号楼' // 楼栋后缀
        },
        editBuildingDialogVisible: false, // 编辑楼栋对话框是否可见
        editBuildingForm: { // 编辑楼栋表单
            id: null, // 楼栋ID
            communityId: null, // 所属小区ID
            name: '', // 楼栋名称
            note: '' // 备注
        },
        // 菜单管理
        menuItems: [], // 菜单项列表
        addMenuItemDialogVisible: false, // 添加菜单项对话框是否可见
        menuItemForm: { // 菜单项表单
            name: '', // 菜品名称
            price: 0, // 菜品价格
            description: '', // 菜品描述
            note: '', // 备注
            options: [] // 菜品选项
        },
        editMenuItemDialogVisible: false, // 编辑菜单项对话框是否可见
        editMenuItemForm: { // 编辑菜单项表单
            id: null, // 菜品ID
            name: '', // 菜品名称
            price: 0, // 菜品价格
            description: '', // 菜品描述
            note: '', // 备注
            is_available: true, // 是否可用
            options: [] // 菜品选项
        },
        buildingAddMode: 'single', // 楼栋添加模式
        orderTab: 'list', // 订单选项卡
        orders: [], // 订单列表
        selectedOrders: [], // 选中的订单
        createOrderDialogVisible: false, // 创建订单对话框是否可见
        orderForm: { // 订单表单
            customer_name: '', // 客户姓名
            room_number: '', // 房间号
            customer_phone: '', // 客户电话
            building_id: null, // 楼栋ID
            delivery_time: '', // 配送时间
            note: '', // 备注
            is_paid: false, // 是否已支付
            status: 'ordered', // 订单状态
            items: [] // 订单项
        },
        addressOptions: [], // 地址选项
        totalAmount: 0, // 总金额
        orderStatusFilter: 'all', // 订单状态筛选
        userPermissions: [], // 用户权限列表
        isAdmin: false, // 是否为管理员
        role: '', // 用户角色
        isMobileView: false, // 是否为移动视图
        menuItemFilter: '', // 菜品筛选
        communityFilter: '', // 小区筛选
        deliveryStatusFilter: 'all', // 配送状态筛选
        orderSortOption: 'time', // 订单排序选项
        batchCreateBuildingDialogVisible: false, // 批量创建楼栋对话框是否可见
        buildingBatchForm: { // 批量创建楼栋表单
            start_num: 1, // 起始编号
            end_num: 1, // 结束编号
            suffix: '', // 后缀
            note: '' // 备注
        },
        currentPage: 1, // 当前页码
        pageSize: 100, // 每页显示的订单数量
        totalOrders: 0, // 添加总订单数
        statusCounts: {  // 添加状态计数缓存
            all: 0,
            ordered: 0,
            delivering: 0,
            completed: 0
        },
        allOrders: [], // 用于缓存所有订单
        todayStats: {
            totalOrders: 0,
            totalAmount: 0
        },
        buttonPosition: {
            x: 20,
            y: 20
        },
        isDragging: false,
        dragOffset: {
            x: 0,
            y: 0
        },
        showItemStatsDialog: false,
        itemStats: {}
    },
    computed: {
        filteredOrders() {
            let filteredOrders = this.allOrders;

            // 状态筛选
            if (this.orderStatusFilter !== 'all') {
                filteredOrders = filteredOrders.filter(order => order.status === this.orderStatusFilter);
            }

            // 商品筛选
            if (this.menuItemFilter) {
                filteredOrders = filteredOrders.filter(order => 
                    order.items && order.items.some(item => 
                        item.menu_item && 
                        item.menu_item.id === this.menuItemFilter
                    )
                );
            }

            // 小区筛选
            if (this.communityFilter) {
                filteredOrders = filteredOrders.filter(order => 
                    order.building && 
                    order.building.community_id === this.communityFilter
                );
            }

            // 添加排序逻辑
            if (this.orderSortOption === 'time') {
                filteredOrders = filteredOrders.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (this.orderSortOption === 'community') {
                filteredOrders = filteredOrders.slice().sort((a, b) => {
                    if (a.building?.community_name === b.building?.community_name) {
                        return (a.building?.name || '').localeCompare(b.building?.name || '');
                    }
                    return (a.building?.community_name || '').localeCompare(b.building?.community_name || '');
                });
            }

            // 计算总金额
            const totalAmount = filteredOrders.reduce((sum, order) => {
                return sum + parseFloat(this.calculateOrderTotal(order));
            }, 0).toFixed(2);

            // 返回统计信息和订单列表
            return {
                totalOrders: filteredOrders.length,
                totalAmount,
                orders: filteredOrders
            };
        },
        paginatedOrders() {
            return this.filteredOrders.orders;
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
                return this.orders.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (this.orderSortOption === 'community') {
                return this.orders.slice().sort((a, b) => {
                    if (a.building.community_name === b.building.community_name) {
                        return a.building.name.localeCompare(b.building.name);
                    }
                    return a.building.community_name.localeCompare(b.building.community_name);
                });
            }
            return this.orders;
        },
        orderCounts() {
            // 在前端计算各状态的订单数量
            return {
                all: this.allOrders.length,
                ordered: this.allOrders.filter(order => order.status === 'ordered').length,
                delivering: this.allOrders.filter(order => order.status === 'delivering').length,
                completed: this.allOrders.filter(order => order.status === 'completed').length
            };
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
                        `批量创建楼栋成功：成功创建${response.data.created_count}个，过${response.data.skipped_count}个`
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
                // console.log('Fetching orders for page:', this.currentPage, 'pageSize:', this.pageSize);
                // 获取所有订单数据
                const response = await axios.get(`/sites/${this.siteId}/orders`, {
                    params: {
                        page_size: this.pageSize,
                        page: this.currentPage
                    }
                });
                
                // 缓存所有订单
                this.allOrders = response.data.orders || [];
                
                // 根据当前筛选状态过滤订单
                let filteredOrders = this.allOrders;
                if (this.orderStatusFilter !== 'all') {
                    filteredOrders = this.allOrders.filter(order => order.status === this.orderStatusFilter);
                }
                
                // 计算分页
                const startIndex = (this.currentPage - 1) * this.pageSize;
                const endIndex = startIndex + this.pageSize;
                this.orders = filteredOrders.slice(startIndex, endIndex);
                this.totalOrders = Math.ceil(response.data.total_orders / response.data.page_size);

                

                // 获取今日统计数据
                await this.fetchTodayStats();
                
                // console.log('Updated orders:', this.orders.length, 'Total:', this.totalOrders);
            } catch (error) {
                console.error('Fetch orders error:', error);
                this.$message.error('获取订单失败');
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
                    // 如果是新订单
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
                // 检查菜品信息是否完整
                if (!item.menu_item || !item.menu_item.price) continue;
                
                // 基础价格 - 直接使用订单中的菜品价格
                let itemPrice = parseFloat(item.menu_item.price) || 0;
                
                // 添加选项价格
                if (item.selected_options && item.selected_options.length > 0) {
                    for (const option of item.selected_options) {
                        itemPrice += parseFloat(option.price) || 0;
                    }
                }
                
                // 乘以数量，确保数量至少为1
                const quantity = Math.max(1, parseInt(item.quantity) || 1);
                total += itemPrice * quantity;
                
                // 添加调试日志
                // console.log(`菜品: ${item.menu_item.name}, 单价: ${itemPrice}, 数量: ${quantity}, 小计: ${itemPrice * quantity}`);
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
            // console.log('Status filter changed to:', value);
            this.orderStatusFilter = value;
            this.currentPage = 1; // 重置到第一页
            this.menuItemFilter = ''; // 重置菜品筛选为全部菜品
            
            // 根据筛选条件过滤订单
            let filteredOrders = this.allOrders;
            if (value !== 'all') {
                filteredOrders = this.allOrders.filter(order => order.status === value);
            }
            
            // 更新分页数据
            const startIndex = 0; // 第一页
            const endIndex = this.pageSize;
            this.orders = filteredOrders.slice(startIndex, endIndex);
            this.totalOrders = filteredOrders.length;
        },
        hasPermission(permission) {
            return this.isAdmin || (this.userPermissions && this.userPermissions.includes(permission));
        },
        // 获取用户信息和权限
        async fetchUserInfo() {
            try {
                const response = await axios.get(`/sites/${this.siteId}/staff/current`);
                // console.log('用户信息:', response.data); // 调试用
                this.username = response.data.username;
                this.role = response.data.role;
                this.isAdmin = response.data.role === 'admin';
                this.userPermissions = response.data.permissions || [];
                // console.log('权限列表:', this.userPermissions); // 调试用
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
        handleMenuItemFilterChange(value) {
            this.menuItemFilter = value;
            // 可以在这里添加其他筛选逻辑，如果需要的话
        },
        handleCommunityFilterChange() {
            // 当小区筛选改变时，可以在这里添加额外的处理逻辑
            console.log('小区筛选已更改:', this.communityFilter);
        },
        getMenuItemCount(menuItemId) {
            // 如果是"全部菜品"选项（menuItemId为空字符串或null），则不显示统计
            if (!menuItemId) {
                return null;
            }
            
            // 计算指定菜品在当前过滤状态下的订单中出现的总数
            let count = 0;
            let amount = 0;
            
            // 根据当前状态过滤器筛选订单
            let filteredOrders = this.allOrders;
            if (this.orderStatusFilter !== 'all') {
                filteredOrders = this.allOrders.filter(order => order.status === this.orderStatusFilter);
            }
            
            // 统计当前过滤状态下的订单中的菜品数量和金额
            filteredOrders.forEach(order => {
                if (order.items) {
                    order.items.forEach(item => {
                        if (item.menu_item && item.menu_item.id === menuItemId) {
                            const quantity = parseInt(item.quantity) || 1;
                            count += quantity;
                            // 计算总金额
                            const price = parseFloat(item.menu_item.price) || 0;
                            amount += price * quantity;
                        }
                    });
                }
            });
            
            return {
                count: count,
                amount: amount.toFixed(2)
            };
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
        async batchCreateBuildings() {
            if (!this.buildingBatchForm.start_num || !this.buildingBatchForm.end_num) {
                this.$message.warning('请输入起始和结束编号');
                return;
            }

            if (this.buildingBatchForm.start_num > this.buildingBatchForm.end_num) {
                this.$message.warning('起始编号不能大于结束编号');
                return;
            }

            try {
                const response = await axios.post(
                    `/sites/${this.siteId}/communities/${this.communityId}/buildings/batch`,
                    {
                        start_num: this.buildingBatchForm.start_num,
                        end_num: this.buildingBatchForm.end_num,
                        suffix: this.buildingBatchForm.suffix || '',
                        note: this.buildingBatchForm.note || ''
                    }
                );
                this.$message.success('批量创建楼栋成功');
                this.fetchCommunities(); // 更新小区信息
            } catch (error) {
                console.error('Batch create buildings error:', error);
                this.$message.error('批量创建楼栋失败');
            }
        },
        async refreshData() {
            try {
                // 重新获取订单数据
                await this.fetchOrders();
                // 重新获取今日统计数据
                await this.fetchTodayStats();
                this.$message.success('数据刷新成功');
            } catch (error) {
                console.error('刷新数据错误:', error);
                this.$message.error('刷新数据失败');
            }
        },
        handlePageChange(page) {
            console.log('Page changed to:', page); // 添加调试日志
            this.currentPage = page;
            this.fetchOrders(); // 重新获取数据
        },
        handleSizeChange(size) {
            console.log('Page size changed to:', size); // 添加调试日志
            this.pageSize = parseInt(size); // 确保size是数字
            this.currentPage = 1; // 重置到第一页
            this.fetchOrders(); // 重新获取数据
        },
        someMethod() {
            const { totalOrders, totalAmount, orders } = this.filteredOrders;
            console.log(`Total Orders: ${totalOrders}, Total Amount: ${totalAmount}`);
            // 其他逻辑
        },
        async fetchTodayStats() {
            try {
                const response = await axios.get(`/sites/${this.siteId}/orders/today-stats`);
                this.todayStats = response.data;
            } catch (error) {
                console.error('获取今日统计数据失败:', error);
                this.$message.error('获取今日统计数据失败');
            }
        },
        startDrag(event) {
            this.isDragging = true;
            const touch = event.touches[0];
            const button = event.target.closest('.floating-add-button');
            const rect = button.getBoundingClientRect();
            
            this.dragOffset.x = touch.clientX - rect.left;
            this.dragOffset.y = touch.clientY - rect.top;
        },
        onDrag(event) {
            if (!this.isDragging) return;
            
            const touch = event.touches[0];
            const maxX = window.innerWidth - 60;  // 按钮宽度为50px，留10px边距
            const maxY = window.innerHeight - 60; // 按钮高度为50px，留10px边距
            
            let newX = touch.clientX - this.dragOffset.x;
            let newY = touch.clientY - this.dragOffset.y;
            
            // 确保按钮不会超出屏幕边界
            newX = Math.max(10, Math.min(maxX, newX));
            newY = Math.max(10, Math.min(maxY, newY));
            
            this.buttonPosition.x = newX;
            this.buttonPosition.y = newY;
            
            event.preventDefault(); // 防止页面滚动
        },
        endDrag() {
            this.isDragging = false;
        },
        async fetchItemStats() {
            try {
                const response = await axios.get(`/sites/${this.siteId}/orders/item-stats`);
                this.itemStats = response.data;
                this.showItemStatsDialog = true;
            } catch (error) {
                console.error('Error fetching item stats:', error);
                this.$message.error('获取商品统计信息失败');
            }
        }
    },
    async mounted() {
        await this.init();
    }
});