// import Vue from 'vue'
import Vue from 'vue/dist/vue.esm.browser.js'
// import $ from 'jquery-slim'
import _ from 'lodash'
import axios from 'axios'
import 'lazysizes'

var moneyMethod = function money(value, decimals, seperator, thousand) {
	value = value / 100;

	var decimals = isNaN(decimals = Math.abs(decimals)) ? 2 : decimals;
    var prefix = value < 0 ? "-" : "";
    var i = String(parseInt(value = Math.abs(Number(value) || 0).toFixed(decimals)));
    var j = (j = i.length) > 3 ? j % 3 : 0;

    var amountWithComma = prefix + (j ? i.substr(0, j) + '.' : "") + i.substr(j).replace(/(\','{3})(?=\',')/g, "$1" + '.') + (decimals ? ',' + Math.abs(value - i).toFixed(decimals).slice(2) : "");
    var amount = prefix + (j ? i.substr(0, j) + ',' : "") + i.substr(j).replace(/(\'.'{3})(?=\'.')/g, "$1" + ',') + (decimals ? '.' + Math.abs(value - i).toFixed(decimals).slice(2) : "");

	return '{{amount_with_comma_separator}} kr.'
    	.replace('{{amount_with_comma_separator}}', amountWithComma)
        .replace('{{amount}}', amount);
};

Vue.component('toggler', {
    props: {
        initialToggled: {
            default: false,
        },
    },
    data: function () {
    	return {
        	toggled: this.initialToggled,
        }
    },
    methods: {
    	toggle: function (value) {
        	if (value === undefined) {
            	value = true
            }

        	if (this.toggled === value) {
            	this.toggled = false;
                return;
            }

        	this.toggled = value;
        },
    }
});

Vue.component('checkout', {
    props: {
        initialZip: {
            required: true,
        },
        initialCountry: {
            required: true,
        },
        initialShippingMethod: {
            required: true,
        },
        initialPaymentMethod: {
            required: true,
        },
        initialTerms: {
            default: false,
        },
    },
    data() {
        return {
            terms: this.initialTerms,
            submitting: false,
            shippingMethods: vueShippingMethods,
            country: this.initialCountry,
            zip: this.initialZip,
            payment_method: this.initialPaymentMethod,
            shipping_method: this.initialShippingMethod,
            shippingLoading: false,
            shipping_pickup_point: null,
        }
    },
    computed: {
            cart: function() {
            return this.$root.cart;
        },
        shippingMethodModel: function () {
            var vm = this;
            return _.find(this.shippingMethods, function (object) {
                return object.id == vm.shipping_method;
            });
        },
        shippingPrice() {
            if (! this.shippingMethodModel) {
                return 0;
            }
            return this.shippingMethodModel.price;
        },
        totalPrice() {
            var subtotal = this.cart.total_price;
            return subtotal + this.shippingPrice;
        },
        validZip() {
            return this.validateZip(this.zip);
        },
        filteredShippingMethods: function () {
            var vm = this;

            return _.filter(this.shippingMethods, function (object) {

                // Check minimum price
                if (object.min_order_subtotal !== null && object.min_order_subtotal > vm.cart.total_price) {
                    return false;
                }

                // Check maximum price
                if (object.max_order_subtotal !== null && object.max_order_subtotal < vm.cart.total_price) {
                    return false;
                }

                // > Check Country
                var hasCountry = _.find (object.countries, function (country) {
                    return country.id == vm.country;
                }) !== undefined;

                if (! hasCountry) {
                    return false;
                }

                return true;
            });
        },
    },
    watch: {
        shipping_method: function (value) {
            this.resetPickupPoint();
        },
        country: function () {
            this.updateShipping();
        },
        zip: function (value) {
            if (this.validateZip(value)) {
                this.updateShipping();
            }
        },
    },
    methods: {
        validateZip(value) {
            return value.length >= 4;
        },
        updateShipping() {
            var vm = this;

            // Default to the first shipping method if none selected.
            if (! this.shipping_method) {
                this.shipping_method = _.first(this.filteredShippingMethods).id;
            }

            var filteredShippingMethod = _.find(this.filteredShippingMethods, function(method) {
                return method.id == vm.shipping_method;
            });

            if (! filteredShippingMethod) {
                filteredShippingMethod = _.first(this.filteredShippingMethods);
                this.shipping_method = filteredShippingMethod ? filteredShippingMethod.id : null;
            }

            this.callApi();
        },
        callApi() {
            this.shippingLoading = true;
            axios.post('/checkout/shipping.js', {
                country: this.country,
                zip: this.zip,
            })
            .then(response => {
                this.shippingMethods = response.data;

                if (! this.shipping_method) {
                    var firstMethod = _.first(this.shippingMethods);
                    this.shipping_method = firstMethod ? firstMethod.id : null;
                }

                this.resetPickupPoint();

                this.shippingLoading = false;
            })
            .catch(e => {
                this.shippingLoading = false;
            })
        },
        resetPickupPoint() {
            if (! this.shippingMethodModel) {
                this.shipping_pickup_point = null;
                return;
            }
            var store = _.first(this.shippingMethodModel.stores);
            this.shipping_pickup_point = store ? store.id : null;
        },
    },
    created() {
        this.updateShipping();
    }
});

Vue.component('product-script', {
    props: {
        product: {
            required: true,
        },
        selectedVariantId: {
            default: null,
        },
    },
    data: function () {
    	return {
        	quantity: 1,
            chosenOptions: [],
        }
    },
     computed: {
        variant() {
            var chosenOptions = _.filter(_.cloneDeep(this.chosenOptions), (option) => {
            	return ! _.isUndefined(option)
            })
			return _.find(this.product.variants, (variant) => {
            	return _.isEqual(chosenOptions, variant.options)
            });
        },
        price() {
        	if (! this.variant) {
            	return this.product.price;
            }
        	var volumePrice = _.find(this.variant.volume_prices.slice().reverse(), (volumePrice) => {
            	return this.quantity >= volumePrice.quantity;
            });

			if (volumePrice) {
            	return volumePrice.price
            }

        	return this.variant.price;
        },
        compare_at_price() {
        	if (! this.variant) {
            	return this.product.compare_at_price;
            }

        	return this.variant.compare_at_price;
        },
        available() {
        	if (! this.variant) {
            	return false;
            }

        	return this.variant.available;
        },
        variantId() {
        	if (! this.variant) {
            	return null;
            }

        	return this.variant.id;
        },
        optionSelects() {
			return _.map(this.product.options, (optionName, optionKey) => {

				var options = _.uniq(_.map(this.product.variants, (variant) => {
                	return variant.options[optionKey]
                }));

                return {
                    label: optionName,
                    values: options
                }
            });
        },
    },
    created() {
    	this.chosenOptions = _.cloneDeep(_.first(this.product.variants).options);
    }
});

Vue.component('carousel', {
	template: '<div :id="_uid" class="owl-carousel" :data-slider-id="sliderId"><slot></slot></div>',
    props: {
        options: {
            default: {},
        },
        sliderId: {
            default: 1,
        },
    },
    mounted() {
        var carousel = $('#' + this._uid).owlCarousel(this.options);

        $('.owl-thumbs a').on('click', function (event) {
            event.preventDefault();

            carousel.trigger('to.owl.carousel', [
                $(this).data('index')
            ]);
        });
	}
});

var app = new Vue({
	el: '#app',
    data: {
    	cart: vueCart,
        money: moneyMethod,
    },
    methods: {
    	changeCartQuantity: function (event, item) {
            this.updateCartRow(item, event.srcElement.value)
        },
        updateCartRow(item, quantity) {
			if (quantity === 'minus') {
				quantity = item.quantity
            	quantity--
            }
            
            if (quantity === 'plus') {
				quantity = item.quantity
            	quantity++
            }
            
            if (quantity === 'remove') {
            	quantity = 0;
            }

            axios.post('/cart/update.js', {
                id: item.id,
                quantity: quantity,
            })
            .then((response) => {
            	this.cart = response.data
            });
        },
    }
});