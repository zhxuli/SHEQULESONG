new Vue({
    el: '#app',
    data() {
        return {
            username: '',
            siteName: '',
            isAdmin: false,
            permissions: [],
            menuItems: [],
            addMenuItemDialogVisible: false,
            editMenuItemDialogVisible: false,
            menuItemForm: {
                name: '',
                price: 0,
                description: '',
                note: '',
                options: []
            },
            editMenuItemForm: {
                id: null,
                name: '',
                price: 0,
                description: '',
                note: '',
                options: [],
                is_available: true
            }
        }
    },
    created() {
        this.checkAuth();
        this.loadMenuItems();
    },
    methods: {
        async checkAuth() {
            try {
                const response = await axios.get('/api/auth/check');
                this.username = response.data.username;
                this.siteName = response.data.site_name;
                this.isAdmin = response.data.is_admin;
                this.permissions = response.data.permissions || [];
                
                // 如果没有菜单管理权限,跳转回主页
                if (!this.isAdmin && !this.permissions.includes('MENU_MANAGE')) {
                    this.$message.error('没有权限访问此页面');
                    window.location.href = '/static/shop.html';
                }
            } catch (error) {
                this.$message.error('请先登录');
                window.location.href = '/static/login.html';
            }
        },
        async loadMenuItems() {
            try {
                const response = await axios.get('/api/menu-items');
                this.menuItems = response.data;
            } catch (error) {
                this.$message.error('加载菜单失败');
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
        addOption() {
            this.menuItemForm.options.push({
                name: '',
                price: 0,
                description: '',
                is_available: true
            });
        },
        removeOption(index) {
            this.menuItemForm.options.splice(index, 1);
        },
        async createMenuItem() {
            try {
                await axios.post('/api/menu-items', this.menuItemForm);
                this.$message.success('添加菜品成功');
                this.addMenuItemDialogVisible = false;
                this.loadMenuItems();
            } catch (error) {
                this.$message.error(error.response?.data?.detail || '添加菜品失败');
            }
        },
        showEditMenuItemDialog(menuItem) {
            this.editMenuItemForm = {
                id: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                description: menuItem.description,
                note: menuItem.note,
                options: [...menuItem.options],
                is_available: menuItem.is_available
            };
            this.editMenuItemDialogVisible = true;
        },
        addEditOption() {
            this.editMenuItemForm.options.push({
                name: '',
                price: 0,
                description: '',
                is_available: true
            });
        },
        removeEditOption(index) {
            this.editMenuItemForm.options.splice(index, 1);
        },
        async updateMenuItem() {
            try {
                await axios.put(`/api/menu-items/${this.editMenuItemForm.id}`, this.editMenuItemForm);
                this.$message.success('更新菜品成功');
                this.editMenuItemDialogVisible = false;
                this.loadMenuItems();
            } catch (error) {
                this.$message.error('更新菜品失败');
            }
        },
        async deleteMenuItem(menuItem) {
            try {
                await this.$confirm('确认删除该菜品?', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                });
                
                await axios.delete(`/api/menu-items/${menuItem.id}`);
                this.$message.success('删除成功');
                this.loadMenuItems();
            } catch (error) {
                if (error !== 'cancel') {
                    this.$message.error('删除失败');
                }
            }
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